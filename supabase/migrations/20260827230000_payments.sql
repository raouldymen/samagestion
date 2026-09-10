-- SamaGestion — paiements & activation automatique des abonnements

-- ---------------------------------------------------------------------------
-- Enrichir subscription_transactions
-- ---------------------------------------------------------------------------

alter table public.subscription_transactions
  add column if not exists internal_reference text,
  add column if not exists plan_id uuid references public.subscription_plans (id) on delete restrict,
  add column if not exists environment text not null default 'test',
  add column if not exists initiated_by uuid references auth.users (id) on delete set null,
  add column if not exists confirmed_at timestamptz,
  add column if not exists failure_reason text;

-- Migrer anciens status "paid" → "successful"
update public.subscription_transactions
set status = 'successful'
where status = 'paid';

alter table public.subscription_transactions
  drop constraint if exists subscription_transactions_status_check;

alter table public.subscription_transactions
  add constraint subscription_transactions_status_check
  check (status in ('pending', 'successful', 'failed', 'cancelled', 'refunded', 'expired'));

alter table public.subscription_transactions
  drop constraint if exists subscription_transactions_environment_check;

alter table public.subscription_transactions
  add constraint subscription_transactions_environment_check
  check (environment in ('test', 'production'));

create unique index if not exists subscription_transactions_internal_reference_uidx
  on public.subscription_transactions (internal_reference)
  where internal_reference is not null;

create index if not exists subscription_transactions_business_created_idx
  on public.subscription_transactions (business_id, created_at desc);

create index if not exists subscription_transactions_env_status_idx
  on public.subscription_transactions (environment, status);

-- Config grace period (jours) — table simple admin future
create table if not exists public.payment_settings (
  id integer primary key default 1 check (id = 1),
  grace_period_days integer not null default 3,
  trial_days integer not null default 14,
  updated_at timestamptz not null default now(),
  constraint payment_settings_grace_non_negative check (grace_period_days >= 0),
  constraint payment_settings_trial_non_negative check (trial_days >= 0)
);

insert into public.payment_settings (id, grace_period_days, trial_days)
values (1, 3, 14)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Référence interne SMG-YYYYMMDD-XXXXXX
-- ---------------------------------------------------------------------------

create or replace function public.generate_payment_reference()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date text := to_char(timezone('Africa/Dakar', now()), 'YYYYMMDD');
  v_suffix text;
  v_ref text;
  v_attempts integer := 0;
begin
  loop
    v_attempts := v_attempts + 1;
    v_suffix := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    v_ref := 'SMG-' || v_date || '-' || v_suffix;
    exit when not exists (
      select 1 from public.subscription_transactions where internal_reference = v_ref
    );
    if v_attempts > 20 then
      raise exception 'REFERENCE_GENERATION_FAILED';
    end if;
  end loop;
  return v_ref;
end;
$$;

-- ---------------------------------------------------------------------------
-- Période calendaire (+1 mois)
-- ---------------------------------------------------------------------------

create or replace function public.add_subscription_month(p_from timestamptz)
returns timestamptz
language sql
immutable
as $$
  select (p_from + interval '1 month')
$$;

-- ---------------------------------------------------------------------------
-- Créer une transaction pending (checkout) — montant depuis le plan en base
-- ---------------------------------------------------------------------------

create or replace function public.create_payment_checkout(
  p_plan_id uuid,
  p_environment text default 'test'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid := public.current_business_id();
  v_plan public.subscription_plans;
  v_sub public.business_subscriptions;
  v_ref text;
  v_env text := case
    when lower(coalesce(p_environment, 'test')) = 'production' then 'production'
    else 'test'
  end;
  v_tx public.subscription_transactions;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;
  if not public.has_permission('settings.edit') then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_plan
  from public.subscription_plans
  where id = p_plan_id and is_active = true;

  if not found then
    raise exception 'PLAN_NOT_FOUND';
  end if;

  if v_plan.slug = 'free' or v_plan.price_monthly <= 0 then
    raise exception 'PLAN_NOT_PAYABLE';
  end if;

  if upper(v_plan.currency) <> 'XOF' then
    raise exception 'UNSUPPORTED_CURRENCY';
  end if;

  v_sub := public.ensure_business_subscription(v_business_id);
  v_ref := public.generate_payment_reference();

  insert into public.subscription_transactions (
    business_id,
    subscription_id,
    plan_id,
    provider,
    provider_transaction_id,
    internal_reference,
    amount,
    currency,
    status,
    environment,
    initiated_by,
    metadata
  )
  values (
    v_business_id,
    v_sub.id,
    v_plan.id,
    'pending',
    v_ref,
    v_ref,
    v_plan.price_monthly,
    v_plan.currency,
    'pending',
    v_env,
    v_user_id,
    jsonb_build_object(
      'plan_slug', v_plan.slug,
      'plan_name', v_plan.name,
      'business_id', v_business_id
    )
  )
  returning * into v_tx;

  return jsonb_build_object(
    'transaction_id', v_tx.id,
    'internal_reference', v_tx.internal_reference,
    'amount', v_tx.amount,
    'currency', v_tx.currency,
    'plan_id', v_plan.id,
    'plan_slug', v_plan.slug,
    'plan_name', v_plan.name,
    'business_id', v_business_id,
    'environment', v_tx.environment,
    'status', v_tx.status
  );
end;
$$;

-- Lier le provider après createCheckout côté app
create or replace function public.attach_payment_provider(
  p_internal_reference text,
  p_provider text,
  p_provider_transaction_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.subscription_transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_tx public.subscription_transactions;
begin
  if not public.has_permission('settings.edit') then
    raise exception 'FORBIDDEN';
  end if;

  update public.subscription_transactions
  set
    provider = coalesce(nullif(btrim(p_provider), ''), provider),
    provider_transaction_id = coalesce(
      nullif(btrim(p_provider_transaction_id), ''),
      provider_transaction_id
    ),
    metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb)
  where internal_reference = p_internal_reference
    and business_id = v_business_id
    and status = 'pending'
  returning * into v_tx;

  if not found then
    raise exception 'TRANSACTION_NOT_FOUND';
  end if;

  return v_tx;
end;
$$;

-- ---------------------------------------------------------------------------
-- Confirmation serveur (idempotente) — appelée via service role après webhook
-- ---------------------------------------------------------------------------

create or replace function public.confirm_subscription_payment(
  p_internal_reference text,
  p_provider text,
  p_provider_transaction_id text,
  p_amount numeric,
  p_currency text,
  p_status text,
  p_event_type text default 'payment.success',
  p_environment text default 'test',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.subscription_transactions;
  v_plan public.subscription_plans;
  v_existing public.subscription_transactions;
  v_current public.business_subscriptions;
  v_new public.business_subscriptions;
  v_from text;
  v_period_start timestamptz;
  v_period_end timestamptz;
  v_member record;
  v_already boolean := false;
begin
  if p_internal_reference is null or btrim(p_internal_reference) = '' then
    raise exception 'REFERENCE_REQUIRED';
  end if;
  if p_provider_transaction_id is null or btrim(p_provider_transaction_id) = '' then
    raise exception 'PROVIDER_TX_REQUIRED';
  end if;

  -- Idempotence : même provider_transaction_id déjà successful
  select * into v_existing
  from public.subscription_transactions
  where provider = p_provider
    and provider_transaction_id = p_provider_transaction_id
    and status = 'successful'
  limit 1;

  if found then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'transaction_id', v_existing.id,
      'internal_reference', v_existing.internal_reference,
      'status', v_existing.status
    );
  end if;

  select * into v_tx
  from public.subscription_transactions
  where internal_reference = btrim(p_internal_reference)
  for update;

  if not found then
    raise exception 'TRANSACTION_NOT_FOUND';
  end if;

  if v_tx.environment is distinct from p_environment then
    raise exception 'ENVIRONMENT_MISMATCH';
  end if;

  if v_tx.status = 'successful' then
    return jsonb_build_object(
      'ok', true,
      'idempotent', true,
      'transaction_id', v_tx.id,
      'internal_reference', v_tx.internal_reference,
      'status', v_tx.status
    );
  end if;

  if v_tx.status not in ('pending', 'failed') then
    raise exception 'TRANSACTION_NOT_CONFIRMABLE:%', v_tx.status;
  end if;

  -- Montant / devise : source de vérité = transaction (elle-même issue du plan)
  if p_amount is distinct from v_tx.amount then
    raise exception 'AMOUNT_MISMATCH:expected=%:got=%', v_tx.amount, p_amount;
  end if;

  if upper(coalesce(p_currency, '')) <> upper(v_tx.currency) then
    raise exception 'CURRENCY_MISMATCH:expected=%:got=%', v_tx.currency, p_currency;
  end if;

  if p_status not in ('successful', 'failed', 'cancelled', 'refunded', 'expired') then
    raise exception 'INVALID_PAYMENT_STATUS';
  end if;

  if p_status <> 'successful' then
    update public.subscription_transactions
    set
      status = p_status,
      provider = coalesce(nullif(btrim(p_provider), ''), provider),
      provider_transaction_id = p_provider_transaction_id,
      failure_reason = coalesce(p_metadata->>'reason', p_event_type),
      metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb)
    where id = v_tx.id
    returning * into v_tx;

    -- Notification échec (owners/managers)
    for v_member in
      select user_id from public.business_members
      where business_id = v_tx.business_id and status = 'active' and role in ('owner', 'manager')
    loop
      insert into public.notifications (
        business_id, user_id, type, title, message, entity_type, entity_id, priority, channel
      ) values (
        v_tx.business_id,
        v_member.user_id,
        'system',
        'Paiement échoué',
        'Votre abonnement n''a pas été renouvelé. Vous pouvez réessayer depuis Facturation.',
        'subscription_transaction',
        v_tx.id,
        'high',
        'in_app'
      );
    end loop;

    return jsonb_build_object(
      'ok', true,
      'idempotent', false,
      'transaction_id', v_tx.id,
      'status', v_tx.status,
      'activated', false
    );
  end if;

  select * into v_plan from public.subscription_plans where id = v_tx.plan_id;
  if not found then
    raise exception 'PLAN_NOT_FOUND';
  end if;

  v_current := public.ensure_business_subscription(v_tx.business_id);
  select slug into v_from from public.subscription_plans where id = v_current.plan_id;

  v_period_start := now();
  v_period_end := public.add_subscription_month(v_period_start);

  -- Expirer l'abonnement courant puis activer le nouveau (un seul courant)
  update public.business_subscriptions
  set status = 'expired',
      cancelled_at = coalesce(cancelled_at, now()),
      updated_at = now()
  where id = v_current.id
    and status in ('trialing', 'active', 'past_due', 'cancelled');

  insert into public.business_subscriptions (
    business_id, plan_id, status, started_at,
    current_period_start, current_period_end, cancel_at_period_end
  )
  values (
    v_tx.business_id, v_plan.id, 'active', v_period_start,
    v_period_start, v_period_end, false
  )
  returning * into v_new;

  update public.subscription_transactions
  set
    status = 'successful',
    provider = coalesce(nullif(btrim(p_provider), ''), provider),
    provider_transaction_id = p_provider_transaction_id,
    subscription_id = v_new.id,
    confirmed_at = now(),
    failure_reason = null,
    metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb)
      || jsonb_build_object('event_type', p_event_type)
  where id = v_tx.id
  returning * into v_tx;

  perform public.write_audit_log(
    case
      when v_from = 'free' then 'subscription.upgraded'
      when p_event_type = 'subscription.renewed' then 'subscription.renewed'
      else 'subscription.upgraded'
    end,
    'subscription',
    v_new.id,
    jsonb_build_object(
      'from', v_from,
      'to', v_plan.slug,
      'reference', v_tx.internal_reference,
      'amount', v_tx.amount
    ),
    v_tx.business_id,
    v_tx.initiated_by
  );

  for v_member in
    select user_id from public.business_members
    where business_id = v_tx.business_id and status = 'active' and role in ('owner', 'manager')
  loop
    insert into public.notifications (
      business_id, user_id, type, title, message, entity_type, entity_id, priority, channel
    ) values (
      v_tx.business_id,
      v_member.user_id,
      'system',
      'Paiement confirmé',
      'Votre abonnement ' || v_plan.name || ' est maintenant actif.',
      'subscription',
      v_new.id,
      'medium',
      'in_app'
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'idempotent', v_already,
    'transaction_id', v_tx.id,
    'internal_reference', v_tx.internal_reference,
    'status', v_tx.status,
    'activated', true,
    'plan_slug', v_plan.slug,
    'period_start', v_period_start,
    'period_end', v_period_end
  );
end;
$$;

-- Renouvellement : prolonger period_end d'un mois calendaire
create or replace function public.renew_subscription_period(
  p_business_id uuid,
  p_provider text,
  p_provider_transaction_id text,
  p_amount numeric,
  p_currency text,
  p_environment text default 'test',
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.business_subscriptions;
  v_plan public.subscription_plans;
  v_ref text;
  v_tx public.subscription_transactions;
  v_new_end timestamptz;
begin
  -- Idempotence
  if exists (
    select 1 from public.subscription_transactions
    where provider = p_provider
      and provider_transaction_id = p_provider_transaction_id
      and status = 'successful'
  ) then
    return jsonb_build_object('ok', true, 'idempotent', true);
  end if;

  select * into v_sub
  from public.business_subscriptions
  where business_id = p_business_id
    and status in ('active', 'past_due', 'cancelled')
  order by created_at desc
  limit 1;

  if not found then
    raise exception 'SUBSCRIPTION_NOT_FOUND';
  end if;

  select * into v_plan from public.subscription_plans where id = v_sub.plan_id;
  if v_plan.slug = 'free' or v_plan.price_monthly <= 0 then
    raise exception 'PLAN_NOT_PAYABLE';
  end if;

  if p_amount is distinct from v_plan.price_monthly then
    raise exception 'AMOUNT_MISMATCH';
  end if;
  if upper(p_currency) <> upper(v_plan.currency) then
    raise exception 'CURRENCY_MISMATCH';
  end if;

  v_new_end := public.add_subscription_month(
    coalesce(greatest(v_sub.current_period_end, now()), now())
  );

  update public.business_subscriptions
  set
    status = 'active',
    current_period_end = v_new_end,
    cancel_at_period_end = false,
    cancelled_at = null,
    updated_at = now()
  where id = v_sub.id;

  v_ref := public.generate_payment_reference();

  insert into public.subscription_transactions (
    business_id, subscription_id, plan_id, provider, provider_transaction_id,
    internal_reference, amount, currency, status, environment, confirmed_at, metadata
  ) values (
    p_business_id, v_sub.id, v_plan.id, p_provider, p_provider_transaction_id,
    v_ref, p_amount, upper(p_currency), 'successful', p_environment, now(),
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('event_type', 'subscription.renewed')
  )
  returning * into v_tx;

  perform public.write_audit_log(
    'subscription.renewed',
    'subscription',
    v_sub.id,
    jsonb_build_object('reference', v_ref, 'period_end', v_new_end),
    p_business_id,
    null
  );

  return jsonb_build_object(
    'ok', true,
    'idempotent', false,
    'period_end', v_new_end,
    'internal_reference', v_ref
  );
end;
$$;

-- Lecture transaction par référence (membre du commerce)
create or replace function public.get_payment_transaction(p_internal_reference text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_tx public.subscription_transactions;
  v_plan public.subscription_plans;
  v_business public.businesses;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  select * into v_tx
  from public.subscription_transactions
  where internal_reference = btrim(p_internal_reference)
    and business_id = v_business_id;

  if not found then
    raise exception 'TRANSACTION_NOT_FOUND';
  end if;

  if not public.has_permission('settings.view') then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_plan from public.subscription_plans where id = v_tx.plan_id;
  select * into v_business from public.businesses where id = v_tx.business_id;

  return jsonb_build_object(
    'id', v_tx.id,
    'internal_reference', v_tx.internal_reference,
    'provider', v_tx.provider,
    'provider_transaction_id', v_tx.provider_transaction_id,
    'amount', v_tx.amount,
    'currency', v_tx.currency,
    'status', v_tx.status,
    'environment', v_tx.environment,
    'created_at', v_tx.created_at,
    'confirmed_at', v_tx.confirmed_at,
    'failure_reason', v_tx.failure_reason,
    'plan', jsonb_build_object(
      'id', v_plan.id,
      'name', v_plan.name,
      'slug', v_plan.slug,
      'price_monthly', v_plan.price_monthly
    ),
    'business', jsonb_build_object(
      'id', v_business.id,
      'name', v_business.name
    )
  );
end;
$$;

-- Expiration avec période de grâce
create or replace function public.expire_stale_subscriptions()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grace integer;
  v_free uuid := public.get_free_plan_id();
  v_sub record;
begin
  select grace_period_days into v_grace from public.payment_settings where id = 1;
  v_grace := coalesce(v_grace, 3);

  -- Passer en past_due juste après échéance (payants)
  update public.business_subscriptions as s
  set status = 'past_due', updated_at = now()
  from public.subscription_plans as p
  where s.plan_id = p.id
    and p.slug <> 'free'
    and s.status in ('active', 'cancelled')
    and s.current_period_end is not null
    and s.current_period_end < now()
    and s.current_period_end >= now() - make_interval(days => v_grace);

  -- Après grâce : expirer + créer Free (sans supprimer les données métier)
  for v_sub in
    select s.*
    from public.business_subscriptions as s
    join public.subscription_plans as p on p.id = s.plan_id
    where p.slug <> 'free'
      and s.status in ('active', 'past_due', 'cancelled', 'trialing')
      and s.current_period_end is not null
      and s.current_period_end < now() - make_interval(days => v_grace)
  loop
    update public.business_subscriptions
    set status = 'expired', updated_at = now()
    where id = v_sub.id;

    if not exists (
      select 1 from public.business_subscriptions
      where business_id = v_sub.business_id
        and status in ('trialing', 'active', 'past_due', 'cancelled')
    ) then
      insert into public.business_subscriptions (
        business_id, plan_id, status, started_at, current_period_start, current_period_end
      ) values (
        v_sub.business_id, v_free, 'active', now(), now(), null
      );
    end if;
  end loop;
end;
$$;

-- change_business_plan : +1 mois calendaire (plus +30 jours)
create or replace function public.change_business_plan(p_plan_slug text)
returns public.business_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_plan public.subscription_plans;
  v_current public.business_subscriptions;
  v_new public.business_subscriptions;
  v_from text;
  v_period_end timestamptz;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;
  if not public.has_permission('settings.edit') then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_plan
  from public.subscription_plans
  where slug = p_plan_slug and is_active = true;

  if not found then
    raise exception 'PLAN_NOT_FOUND';
  end if;

  -- Les plans payants ne s'activent plus via change_business_plan (paiement requis)
  if v_plan.slug <> 'free' and v_plan.price_monthly > 0 then
    raise exception 'PAYMENT_REQUIRED';
  end if;

  v_current := public.ensure_business_subscription(v_business_id);
  select slug into v_from from public.subscription_plans where id = v_current.plan_id;

  if v_current.plan_id = v_plan.id
     and v_current.status in ('active', 'trialing')
     and coalesce(v_current.cancel_at_period_end, false) = false then
    return v_current;
  end if;

  v_period_end := null;

  update public.business_subscriptions
  set status = 'expired',
      cancelled_at = coalesce(cancelled_at, now()),
      updated_at = now()
  where id = v_current.id
    and status in ('trialing', 'active', 'past_due', 'cancelled');

  insert into public.business_subscriptions (
    business_id, plan_id, status, started_at, current_period_start, current_period_end
  )
  values (v_business_id, v_plan.id, 'active', now(), now(), v_period_end)
  returning * into v_new;

  perform public.write_audit_log(
    'subscription.downgraded',
    'subscription',
    v_new.id,
    jsonb_build_object('from', v_from, 'to', v_plan.slug)
  );

  return v_new;
end;
$$;

-- Stats MRR (préparation admin — pas d'UI)
create or replace function public.subscription_revenue_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mrr numeric := 0;
  v_subscribers integer := 0;
  v_free integer := 0;
begin
  select
    coalesce(sum(p.price_monthly), 0),
    count(*) filter (where p.slug <> 'free'),
    count(*) filter (where p.slug = 'free')
  into v_mrr, v_subscribers, v_free
  from public.business_subscriptions as s
  join public.subscription_plans as p on p.id = s.plan_id
  where s.status in ('active', 'trialing', 'past_due', 'cancelled')
    and (s.current_period_end is null or s.current_period_end >= now());

  return jsonb_build_object(
    'mrr', v_mrr,
    'arr', v_mrr * 12,
    'paid_subscribers', v_subscribers,
    'free_subscribers', v_free
  );
end;
$$;

revoke all on function public.generate_payment_reference() from public;
revoke all on function public.create_payment_checkout(uuid, text) from public;
revoke all on function public.attach_payment_provider(text, text, text, jsonb) from public;
revoke all on function public.confirm_subscription_payment(text, text, text, numeric, text, text, text, text, jsonb) from public;
revoke all on function public.renew_subscription_period(uuid, text, text, numeric, text, text, jsonb) from public;
revoke all on function public.get_payment_transaction(text) from public;
revoke all on function public.subscription_revenue_snapshot() from public;

grant execute on function public.create_payment_checkout(uuid, text) to authenticated;
grant execute on function public.attach_payment_provider(text, text, text, jsonb) to authenticated;
grant execute on function public.get_payment_transaction(text) to authenticated;

-- confirm / renew : service_role uniquement (webhook)
grant execute on function public.confirm_subscription_payment(text, text, text, numeric, text, text, text, text, jsonb) to service_role;
grant execute on function public.renew_subscription_period(uuid, text, text, numeric, text, text, jsonb) to service_role;
grant execute on function public.subscription_revenue_snapshot() to service_role;

alter table public.payment_settings enable row level security;
alter table public.payment_settings force row level security;
-- Pas de policy select pour authenticated : réservé admin/service
