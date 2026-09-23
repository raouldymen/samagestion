-- Le super admin doit pouvoir forcer une formule via son propre compte
-- (pas seulement service_role), sans recréer une ligne qui casse l'index unique
-- ni le trigger de promotion Business.

create or replace function public.admin_set_business_plan(
  p_business_id uuid,
  p_plan_slug text,
  p_period_days integer default 30,
  p_admin_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan public.subscription_plans;
  v_current public.business_subscriptions;
  v_new public.business_subscriptions;
  v_from text;
  v_days integer := greatest(1, least(coalesce(p_period_days, 30), 365));
  v_period_end timestamptz;
begin
  if auth.role() is distinct from 'service_role' and not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;

  if p_business_id is null or not exists (select 1 from public.businesses where id = p_business_id) then
    raise exception 'BUSINESS_NOT_FOUND';
  end if;

  select * into v_plan
  from public.subscription_plans
  where slug = p_plan_slug and is_active = true;

  if not found then
    raise exception 'PLAN_NOT_FOUND';
  end if;

  if v_plan.slug = 'free' then
    v_period_end := null;
  else
    v_period_end := now() + make_interval(days => v_days);
  end if;

  select s.* into v_current
  from public.business_subscriptions as s
  where s.business_id = p_business_id
  order by
    case when s.status in ('trialing', 'active', 'past_due', 'cancelled') then 0 else 1 end,
    s.created_at desc
  limit 1;

  if v_current.id is not null then
    select p.slug into v_from from public.subscription_plans as p where p.id = v_current.plan_id;

    update public.business_subscriptions
    set plan_id = v_plan.id,
        status = 'active',
        current_period_start = now(),
        current_period_end = v_period_end,
        trial_start = null,
        trial_end = null,
        cancel_at_period_end = false,
        cancelled_at = null,
        updated_at = now()
    where id = v_current.id
    returning * into v_new;
  else
    insert into public.business_subscriptions (
      business_id, plan_id, status, started_at, current_period_start, current_period_end,
      cancel_at_period_end, cancelled_at
    )
    values (p_business_id, v_plan.id, 'active', now(), now(), v_period_end, false, null)
    returning * into v_new;

    if v_plan.slug = 'free' and (v_new.plan_id <> v_plan.id or v_new.status <> 'active') then
      update public.business_subscriptions
      set plan_id = v_plan.id,
          status = 'active',
          trial_start = null,
          trial_end = null,
          current_period_end = null,
          cancel_at_period_end = false,
          cancelled_at = null,
          updated_at = now()
      where id = v_new.id
      returning * into v_new;
    end if;
  end if;

  begin
    perform public.write_audit_log(
      'subscription.admin_set_plan',
      'subscription',
      v_new.id,
      jsonb_build_object('from', v_from, 'to', v_plan.slug, 'period_days', v_days),
      p_business_id,
      coalesce(p_admin_user_id, auth.uid())
    );
  exception
    when others then
      null;
  end;

  return jsonb_build_object(
    'businessId', p_business_id,
    'plan', v_plan.slug,
    'status', v_new.status,
    'periodEnd', v_new.current_period_end
  );
end;
$$;

create or replace function public.admin_extend_business_trial(
  p_business_id uuid,
  p_extra_days integer default 14,
  p_admin_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_extra_days, 14), 90));
  v_sub public.business_subscriptions;
  v_plan public.subscription_plans;
  v_business_plan uuid;
  v_end timestamptz;
begin
  if auth.role() is distinct from 'service_role' and not public.is_platform_admin() then
    raise exception 'FORBIDDEN';
  end if;

  if p_business_id is null or not exists (select 1 from public.businesses where id = p_business_id) then
    raise exception 'BUSINESS_NOT_FOUND';
  end if;

  select id into v_business_plan
  from public.subscription_plans
  where slug = 'business' and is_active = true
  limit 1;

  select s.* into v_sub
  from public.business_subscriptions as s
  where s.business_id = p_business_id
  order by
    case when s.status in ('trialing', 'active', 'past_due', 'cancelled') then 0 else 1 end,
    s.created_at desc
  limit 1;

  v_end := greatest(coalesce(v_sub.trial_end, now()), now()) + make_interval(days => v_days);

  if v_sub.id is null then
    if v_business_plan is null then
      raise exception 'PLAN_NOT_FOUND';
    end if;

    insert into public.business_subscriptions (
      business_id, plan_id, status, started_at, current_period_start, current_period_end,
      trial_start, trial_end, cancel_at_period_end
    )
    values (
      p_business_id, v_business_plan, 'trialing', now(), now(), v_end,
      now(), v_end, false
    )
    returning * into v_sub;
  else
    select * into v_plan from public.subscription_plans where id = v_sub.plan_id;

    update public.business_subscriptions
    set plan_id = case when v_plan.slug = 'free' and v_business_plan is not null then v_business_plan else plan_id end,
        status = 'trialing',
        trial_start = coalesce(trial_start, now()),
        trial_end = v_end,
        current_period_start = coalesce(current_period_start, now()),
        current_period_end = v_end,
        cancel_at_period_end = false,
        cancelled_at = null,
        updated_at = now()
    where id = v_sub.id
    returning * into v_sub;
  end if;

  begin
    perform public.write_audit_log(
      'subscription.admin_extend_trial',
      'subscription',
      v_sub.id,
      jsonb_build_object('extra_days', v_days, 'trial_end', v_sub.trial_end),
      p_business_id,
      coalesce(p_admin_user_id, auth.uid())
    );
  exception
    when others then
      null;
  end;

  return jsonb_build_object(
    'businessId', p_business_id,
    'status', v_sub.status,
    'trialEnd', v_sub.trial_end,
    'periodEnd', v_sub.current_period_end
  );
end;
$$;

revoke all on function public.admin_set_business_plan(uuid, text, integer, uuid) from public;
revoke all on function public.admin_extend_business_trial(uuid, integer, uuid) from public;
grant execute on function public.admin_set_business_plan(uuid, text, integer, uuid) to authenticated;
grant execute on function public.admin_extend_business_trial(uuid, integer, uuid) to authenticated;
grant execute on function public.admin_set_business_plan(uuid, text, integer, uuid) to service_role;
grant execute on function public.admin_extend_business_trial(uuid, integer, uuid) to service_role;
