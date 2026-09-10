-- SamaGestion — abonnements & monétisation (sans prestataire de paiement)

-- ---------------------------------------------------------------------------
-- Plans
-- ---------------------------------------------------------------------------

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price_monthly numeric(12, 2) not null default 0,
  currency text not null default 'XOF',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscription_plans_slug_check check (slug in ('free', 'pro', 'business')),
  constraint subscription_plans_currency_check check (currency = 'XOF'),
  constraint subscription_plans_price_non_negative check (price_monthly >= 0)
);

create table if not exists public.subscription_plan_features (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.subscription_plans (id) on delete cascade,
  feature_key text not null,
  enabled boolean not null default true,
  limit_value integer,
  created_at timestamptz not null default now(),
  constraint subscription_plan_features_unique unique (plan_id, feature_key),
  constraint subscription_plan_features_limit_check
    check (limit_value is null or limit_value >= 0)
);

create table if not exists public.business_subscriptions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  plan_id uuid not null references public.subscription_plans (id) on delete restrict,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_subscriptions_status_check
    check (status in ('trialing', 'active', 'past_due', 'cancelled', 'expired'))
);

-- Un seul abonnement "courant" par commerce (actif / essai / past_due / cancelled en période)
create unique index if not exists business_subscriptions_one_current_idx
  on public.business_subscriptions (business_id)
  where status in ('trialing', 'active', 'past_due', 'cancelled');

create table if not exists public.subscription_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  subscription_id uuid references public.business_subscriptions (id) on delete set null,
  provider text not null default 'manual',
  provider_transaction_id text,
  amount numeric(12, 2) not null default 0,
  currency text not null default 'XOF',
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint subscription_transactions_status_check
    check (status in ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  constraint subscription_transactions_provider_tx_unique
    unique (provider, provider_transaction_id)
);

drop trigger if exists subscription_plans_set_updated_at on public.subscription_plans;
create trigger subscription_plans_set_updated_at
  before update on public.subscription_plans
  for each row execute procedure public.set_updated_at();

drop trigger if exists business_subscriptions_set_updated_at on public.business_subscriptions;
create trigger business_subscriptions_set_updated_at
  before update on public.business_subscriptions
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed plans + features
-- ---------------------------------------------------------------------------

insert into public.subscription_plans (name, slug, description, price_monthly, sort_order)
values
  ('Gratuit', 'free', 'Pour démarrer avec l''essentiel.', 0, 1),
  ('Pro', 'pro', 'Pour les commerces en croissance.', 5000, 2),
  ('Business', 'business', 'Pour les équipes et l''audit avancé.', 10000, 3)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  price_monthly = excluded.price_monthly,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

-- Remplacer les features pour rester synchronisé avec la config
delete from public.subscription_plan_features
where plan_id in (select id from public.subscription_plans where slug in ('free', 'pro', 'business'));

insert into public.subscription_plan_features (plan_id, feature_key, enabled, limit_value)
select p.id, f.feature_key, f.enabled, f.limit_value
from public.subscription_plans as p
cross join lateral (
  values
    ('products', true, 100),
    ('sales_monthly', true, 100),
    ('customers', true, 100),
    ('team_members', true, 1),
    ('exports', false, null),
    ('financial_reports', false, null),
    ('team_management', false, null),
    ('audit_logs', false, null),
    ('priority_support', false, null)
) as f(feature_key, enabled, limit_value)
where p.slug = 'free';

insert into public.subscription_plan_features (plan_id, feature_key, enabled, limit_value)
select p.id, f.feature_key, f.enabled, f.limit_value
from public.subscription_plans as p
cross join lateral (
  values
    ('products', true, 1000),
    ('sales_monthly', true, null),
    ('customers', true, null),
    ('team_members', true, 5),
    ('exports', true, null),
    ('financial_reports', true, null),
    ('team_management', true, null),
    ('audit_logs', false, null),
    ('priority_support', false, null)
) as f(feature_key, enabled, limit_value)
where p.slug = 'pro';

insert into public.subscription_plan_features (plan_id, feature_key, enabled, limit_value)
select p.id, f.feature_key, f.enabled, f.limit_value
from public.subscription_plans as p
cross join lateral (
  values
    ('products', true, null),
    ('sales_monthly', true, null),
    ('customers', true, null),
    ('team_members', true, 20),
    ('exports', true, null),
    ('financial_reports', true, null),
    ('team_management', true, null),
    ('audit_logs', true, null),
    ('priority_support', true, null)
) as f(feature_key, enabled, limit_value)
where p.slug = 'business';

-- ---------------------------------------------------------------------------
-- Helpers abonnement effectif
-- ---------------------------------------------------------------------------

create or replace function public.expire_stale_subscriptions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.business_subscriptions
  set status = 'expired',
      updated_at = now()
  where status in ('active', 'past_due', 'cancelled', 'trialing')
    and current_period_end is not null
    and current_period_end < now()
    and cancel_at_period_end = true;

  update public.business_subscriptions
  set status = 'expired',
      updated_at = now()
  where status in ('trialing')
    and trial_end is not null
    and trial_end < now()
    and current_period_end is not null
    and current_period_end < now();

  update public.business_subscriptions
  set status = 'expired',
      updated_at = now()
  where status in ('active', 'past_due')
    and current_period_end is not null
    and current_period_end < now()
    and plan_id <> (select id from public.subscription_plans where slug = 'free' limit 1);
end;
$$;

create or replace function public.get_free_plan_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.subscription_plans where slug = 'free' and is_active = true limit 1
$$;

create or replace function public.ensure_business_subscription(p_business_id uuid)
returns public.business_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.business_subscriptions;
  v_free uuid := public.get_free_plan_id();
begin
  perform public.expire_stale_subscriptions();

  select * into v_sub
  from public.business_subscriptions
  where business_id = p_business_id
    and status in ('trialing', 'active', 'past_due', 'cancelled')
  order by created_at desc
  limit 1;

  if found then
    if v_sub.current_period_end is not null
       and v_sub.current_period_end < now()
       and v_sub.plan_id is distinct from v_free then
      update public.business_subscriptions
      set status = 'expired', updated_at = now()
      where id = v_sub.id;

      insert into public.business_subscriptions (
        business_id, plan_id, status, started_at, current_period_start, current_period_end
      )
      values (p_business_id, v_free, 'active', now(), now(), null)
      returning * into v_sub;
    end if;
    return v_sub;
  end if;

  insert into public.business_subscriptions (
    business_id, plan_id, status, started_at, current_period_start, current_period_end
  )
  values (p_business_id, v_free, 'active', now(), now(), null)
  returning * into v_sub;

  return v_sub;
end;
$$;

create or replace function public.get_effective_plan_id(p_business_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_sub public.business_subscriptions;
  v_free uuid := public.get_free_plan_id();
begin
  v_sub := public.ensure_business_subscription(p_business_id);

  if v_sub.status in ('active', 'trialing', 'past_due', 'cancelled') then
    if v_sub.current_period_end is null or v_sub.current_period_end >= now() then
      return v_sub.plan_id;
    end if;
  end if;

  return v_free;
end;
$$;

create or replace function public.has_plan_feature(p_feature text, p_business_id uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_id uuid := coalesce(p_business_id, public.current_business_id());
  v_plan_id uuid;
  v_enabled boolean;
begin
  if v_business_id is null then
    return false;
  end if;

  v_plan_id := public.get_effective_plan_id(v_business_id);

  select enabled into v_enabled
  from public.subscription_plan_features
  where plan_id = v_plan_id
    and feature_key = p_feature
  limit 1;

  return coalesce(v_enabled, false);
end;
$$;

create or replace function public.get_plan_limit(p_feature text, p_business_id uuid default null)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_id uuid := coalesce(p_business_id, public.current_business_id());
  v_plan_id uuid;
  v_limit integer;
  v_enabled boolean;
begin
  if v_business_id is null then
    return 0;
  end if;

  v_plan_id := public.get_effective_plan_id(v_business_id);

  select enabled, limit_value into v_enabled, v_limit
  from public.subscription_plan_features
  where plan_id = v_plan_id
    and feature_key = p_feature
  limit 1;

  if not coalesce(v_enabled, false) then
    return 0;
  end if;

  return v_limit; -- null = illimité
end;
$$;

create or replace function public.count_plan_usage(p_feature text, p_business_id uuid default null)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_id uuid := coalesce(p_business_id, public.current_business_id());
  v_count integer := 0;
  v_from timestamptz;
  v_to timestamptz;
begin
  if v_business_id is null then
    return 0;
  end if;

  if p_feature = 'products' then
    select count(*)::integer into v_count
    from public.products
    where business_id = v_business_id and is_active = true;
  elsif p_feature = 'customers' then
    select count(*)::integer into v_count
    from public.customers
    where business_id = v_business_id;
  elsif p_feature = 'team_members' then
    select (
      (select count(*) from public.business_members
       where business_id = v_business_id and status in ('active', 'invited'))
      +
      (select count(*) from public.business_invitations
       where business_id = v_business_id and status = 'pending' and expires_at >= now())
    )::integer into v_count;
  elsif p_feature = 'sales_monthly' then
    v_from := timezone('Africa/Dakar', date_trunc('month', timezone('Africa/Dakar', now())));
    v_to := timezone('Africa/Dakar', date_trunc('month', timezone('Africa/Dakar', now())) + interval '1 month');
    select count(*)::integer into v_count
    from public.sales
    where business_id = v_business_id
      and status = 'completed'
      and created_at >= v_from
      and created_at < v_to;
  else
    v_count := 0;
  end if;

  return coalesce(v_count, 0);
end;
$$;

create or replace function public.assert_plan_limit(p_feature text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_usage integer;
begin
  v_limit := public.get_plan_limit(p_feature);
  if v_limit is null then
    return;
  end if;

  v_usage := public.count_plan_usage(p_feature);
  if v_usage >= v_limit then
    raise exception 'PLAN_LIMIT_REACHED:%:%:%', p_feature, v_usage, v_limit;
  end if;
end;
$$;

create or replace function public.assert_plan_feature(p_feature text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_plan_feature(p_feature) then
    raise exception 'FEATURE_NOT_AVAILABLE:%', p_feature;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Bundle lecture
-- ---------------------------------------------------------------------------

create or replace function public.get_subscription_bundle()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_sub public.business_subscriptions;
  v_plan public.subscription_plans;
  v_features jsonb;
  v_usage jsonb;
  v_days integer;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  v_sub := public.ensure_business_subscription(v_business_id);
  select * into v_plan from public.subscription_plans where id = public.get_effective_plan_id(v_business_id);

  select coalesce(jsonb_object_agg(f.feature_key, jsonb_build_object(
    'enabled', f.enabled,
    'limit', f.limit_value
  )), '{}'::jsonb)
  into v_features
  from public.subscription_plan_features as f
  where f.plan_id = v_plan.id;

  v_usage := jsonb_build_object(
    'products', public.count_plan_usage('products', v_business_id),
    'sales_monthly', public.count_plan_usage('sales_monthly', v_business_id),
    'customers', public.count_plan_usage('customers', v_business_id),
    'team_members', public.count_plan_usage('team_members', v_business_id)
  );

  if v_sub.current_period_end is not null then
    v_days := greatest(0, ceil(extract(epoch from (v_sub.current_period_end - now())) / 86400.0)::integer);
  else
    v_days := null;
  end if;

  return jsonb_build_object(
    'subscription', jsonb_build_object(
      'id', v_sub.id,
      'business_id', v_sub.business_id,
      'plan_id', v_plan.id,
      'status', v_sub.status,
      'started_at', v_sub.started_at,
      'current_period_start', v_sub.current_period_start,
      'current_period_end', v_sub.current_period_end,
      'trial_start', v_sub.trial_start,
      'trial_end', v_sub.trial_end,
      'cancel_at_period_end', v_sub.cancel_at_period_end,
      'cancelled_at', v_sub.cancelled_at,
      'days_remaining', v_days,
      'is_trial', v_sub.status = 'trialing',
      'is_active', v_sub.status in ('active', 'trialing', 'past_due')
        or (v_sub.status = 'cancelled' and (v_sub.current_period_end is null or v_sub.current_period_end >= now()))
    ),
    'plan', jsonb_build_object(
      'id', v_plan.id,
      'name', v_plan.name,
      'slug', v_plan.slug,
      'description', v_plan.description,
      'price_monthly', v_plan.price_monthly,
      'currency', v_plan.currency
    ),
    'features', v_features,
    'usage', v_usage
  );
end;
$$;

create or replace function public.list_subscription_plans()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'slug', p.slug,
      'description', p.description,
      'price_monthly', p.price_monthly,
      'currency', p.currency,
      'sort_order', p.sort_order,
      'features', (
        select coalesce(jsonb_object_agg(f.feature_key, jsonb_build_object(
          'enabled', f.enabled,
          'limit', f.limit_value
        )), '{}'::jsonb)
        from public.subscription_plan_features as f
        where f.plan_id = p.id
      )
    )
    order by p.sort_order
  ), '[]'::jsonb)
  from public.subscription_plans as p
  where p.is_active = true;
$$;

-- ---------------------------------------------------------------------------
-- Changement de plan (manuel / futur paiement) — owner uniquement
-- ---------------------------------------------------------------------------

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

  v_current := public.ensure_business_subscription(v_business_id);
  select slug into v_from from public.subscription_plans where id = v_current.plan_id;

  if v_current.plan_id = v_plan.id
     and v_current.status in ('active', 'trialing')
     and coalesce(v_current.cancel_at_period_end, false) = false then
    return v_current;
  end if;

  -- free = période ouverte ; payant = 30 jours (paiement branché plus tard)
  if v_plan.slug = 'free' then
    v_period_end := null;
  else
    v_period_end := now() + interval '30 days';
  end if;

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
    case
      when v_plan.slug = 'free' then 'subscription.downgraded'
      when v_from = 'free' then 'subscription.upgraded'
      else 'subscription.upgraded'
    end,
    'subscription',
    v_new.id,
    jsonb_build_object('from', v_from, 'to', v_plan.slug)
  );

  return v_new;
end;
$$;

create or replace function public.cancel_business_subscription()
returns public.business_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_sub public.business_subscriptions;
  v_free uuid := public.get_free_plan_id();
begin
  if not public.has_permission('settings.edit') then
    raise exception 'FORBIDDEN';
  end if;

  v_sub := public.ensure_business_subscription(v_business_id);

  if v_sub.plan_id = v_free then
    return v_sub;
  end if;

  update public.business_subscriptions
  set cancel_at_period_end = true,
      cancelled_at = now(),
      status = 'cancelled',
      updated_at = now()
  where id = v_sub.id
  returning * into v_sub;

  perform public.write_audit_log(
    'subscription.cancelled',
    'subscription',
    v_sub.id,
    jsonb_build_object('cancel_at_period_end', true)
  );

  return v_sub;
end;
$$;

create or replace function public.reactivate_business_subscription()
returns public.business_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_sub public.business_subscriptions;
begin
  if not public.has_permission('settings.edit') then
    raise exception 'FORBIDDEN';
  end if;

  v_sub := public.ensure_business_subscription(v_business_id);

  if v_sub.status = 'cancelled'
     and (v_sub.current_period_end is null or v_sub.current_period_end >= now()) then
    update public.business_subscriptions
    set cancel_at_period_end = false,
        cancelled_at = null,
        status = 'active',
        updated_at = now()
    where id = v_sub.id
    returning * into v_sub;

    perform public.write_audit_log(
      'subscription.reactivated',
      'subscription',
      v_sub.id,
      '{}'::jsonb
    );
  end if;

  return v_sub;
end;
$$;

create or replace function public.record_subscription_transaction(
  p_provider text,
  p_provider_transaction_id text,
  p_amount numeric,
  p_status text,
  p_subscription_id uuid default null,
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

  insert into public.subscription_transactions (
    business_id, subscription_id, provider, provider_transaction_id, amount, currency, status, metadata
  )
  values (
    v_business_id,
    p_subscription_id,
    coalesce(nullif(btrim(p_provider), ''), 'manual'),
    nullif(btrim(p_provider_transaction_id), ''),
    coalesce(p_amount, 0),
    'XOF',
    coalesce(p_status, 'pending'),
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (provider, provider_transaction_id) do update
    set status = excluded.status,
        metadata = excluded.metadata
  returning * into v_tx;

  return v_tx;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_business : free auto
-- ---------------------------------------------------------------------------

create or replace function public.create_business(
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_address text default null
)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_business public.businesses;
  v_free uuid := public.get_free_plan_id();
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'BUSINESS_NAME_REQUIRED';
  end if;

  insert into public.businesses (name, phone, email, address, currency, owner_id, country)
  values (
    btrim(p_name),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(btrim(coalesce(p_email, '')), ''),
    nullif(btrim(coalesce(p_address, '')), ''),
    'XOF',
    v_user_id,
    'Sénégal'
  )
  returning * into v_business;

  insert into public.business_members (business_id, user_id, role, status)
  values (v_business.id, v_user_id, 'owner', 'active');

  insert into public.business_subscriptions (
    business_id, plan_id, status, started_at, current_period_start, current_period_end
  )
  values (v_business.id, v_free, 'active', now(), now(), null);

  perform public.write_audit_log(
    'subscription.created',
    'subscription',
    null,
    jsonb_build_object('plan', 'free'),
    v_business.id,
    v_user_id
  );

  return v_business;
end;
$$;

-- Backfill free pour commerces existants
insert into public.business_subscriptions (business_id, plan_id, status, started_at, current_period_start)
select b.id, public.get_free_plan_id(), 'active', now(), now()
from public.businesses as b
where not exists (
  select 1 from public.business_subscriptions as s where s.business_id = b.id
);

-- ---------------------------------------------------------------------------
-- Gardes SQL via triggers (défense en profondeur)
-- ---------------------------------------------------------------------------

create or replace function public.enforce_products_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active is distinct from false then
    perform public.assert_plan_limit('products');
  end if;
  return new;
end;
$$;

drop trigger if exists products_plan_limit on public.products;
create trigger products_plan_limit
  before insert on public.products
  for each row execute procedure public.enforce_products_plan_limit();

create or replace function public.enforce_customers_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_plan_limit('customers');
  return new;
end;
$$;

drop trigger if exists customers_plan_limit on public.customers;
create trigger customers_plan_limit
  before insert on public.customers
  for each row execute procedure public.enforce_customers_plan_limit();

create or replace function public.enforce_sales_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' then
    perform public.assert_plan_limit('sales_monthly');
  end if;
  return new;
end;
$$;

drop trigger if exists sales_plan_limit on public.sales;
create trigger sales_plan_limit
  before insert on public.sales
  for each row execute procedure public.enforce_sales_plan_limit();

create or replace function public.enforce_team_plan_limits()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'business_invitations' then
    if not public.has_plan_feature('team_management', new.business_id) then
      raise exception 'FEATURE_NOT_AVAILABLE:team_management';
    end if;
  end if;

  perform set_config('samagestion.plan_check_business', new.business_id::text, true);
  -- count_plan_usage uses current_business_id; for invites use explicit business
  if public.get_plan_limit('team_members', new.business_id) is not null
     and public.count_plan_usage('team_members', new.business_id)
        >= public.get_plan_limit('team_members', new.business_id) then
    raise exception 'PLAN_LIMIT_REACHED:team_members:%:%',
      public.count_plan_usage('team_members', new.business_id),
      public.get_plan_limit('team_members', new.business_id);
  end if;

  return new;
end;
$$;

drop trigger if exists invitations_plan_limit on public.business_invitations;
create trigger invitations_plan_limit
  before insert on public.business_invitations
  for each row execute procedure public.enforce_team_plan_limits();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.subscription_plans enable row level security;
alter table public.subscription_plans force row level security;
alter table public.subscription_plan_features enable row level security;
alter table public.subscription_plan_features force row level security;
alter table public.business_subscriptions enable row level security;
alter table public.business_subscriptions force row level security;
alter table public.subscription_transactions enable row level security;
alter table public.subscription_transactions force row level security;

drop policy if exists "subscription_plans_select" on public.subscription_plans;
create policy "subscription_plans_select"
  on public.subscription_plans
  for select
  to authenticated
  using (is_active = true);

drop policy if exists "subscription_plan_features_select" on public.subscription_plan_features;
create policy "subscription_plan_features_select"
  on public.subscription_plan_features
  for select
  to authenticated
  using (
    exists (
      select 1 from public.subscription_plans as p
      where p.id = plan_id and p.is_active = true
    )
  );

drop policy if exists "business_subscriptions_member_select" on public.business_subscriptions;
create policy "business_subscriptions_member_select"
  on public.business_subscriptions
  for select
  to authenticated
  using (public.is_business_member(business_id));

drop policy if exists "subscription_transactions_member_select" on public.subscription_transactions;
create policy "subscription_transactions_member_select"
  on public.subscription_transactions
  for select
  to authenticated
  using (
    public.is_business_member(business_id)
    and public.has_permission('settings.view')
  );

grant select on table public.subscription_plans to authenticated;
grant select on table public.subscription_plan_features to authenticated;
grant select on table public.business_subscriptions to authenticated;
grant select on table public.subscription_transactions to authenticated;

revoke all on function public.get_subscription_bundle() from public;
revoke all on function public.list_subscription_plans() from public;
revoke all on function public.change_business_plan(text) from public;
revoke all on function public.cancel_business_subscription() from public;
revoke all on function public.reactivate_business_subscription() from public;
revoke all on function public.record_subscription_transaction(text, text, numeric, text, uuid, jsonb) from public;
revoke all on function public.has_plan_feature(text, uuid) from public;
revoke all on function public.get_plan_limit(text, uuid) from public;
revoke all on function public.count_plan_usage(text, uuid) from public;

grant execute on function public.get_subscription_bundle() to authenticated;
grant execute on function public.list_subscription_plans() to authenticated;
grant execute on function public.change_business_plan(text) to authenticated;
grant execute on function public.cancel_business_subscription() to authenticated;
grant execute on function public.reactivate_business_subscription() to authenticated;
grant execute on function public.record_subscription_transaction(text, text, numeric, text, uuid, jsonb) to authenticated;
grant execute on function public.has_plan_feature(text, uuid) to authenticated;
grant execute on function public.get_plan_limit(text, uuid) to authenticated;
grant execute on function public.count_plan_usage(text, uuid) to authenticated;

-- Anon peut voir les plans (page /pricing publique)
grant select on table public.subscription_plans to anon;
grant select on table public.subscription_plan_features to anon;
grant execute on function public.list_subscription_plans() to anon;
