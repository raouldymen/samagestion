-- Le super admin distingue les abonnements Gratuit, Pro et Business.
create or replace function public.subscription_revenue_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mrr numeric := 0;
  v_free integer := 0;
  v_pro integer := 0;
  v_business integer := 0;
  v_subscriptions jsonb := '[]'::jsonb;
begin
  select
    coalesce(sum(p.price_monthly) filter (where p.slug <> 'free'), 0),
    count(*) filter (where p.slug = 'free'),
    count(*) filter (where p.slug = 'pro'),
    count(*) filter (where p.slug = 'business')
  into v_mrr, v_free, v_pro, v_business
  from public.business_subscriptions as s
  join public.subscription_plans as p on p.id = s.plan_id
  where s.status in ('active', 'trialing', 'past_due', 'cancelled')
    and (s.current_period_end is null or s.current_period_end >= now());

  select coalesce(jsonb_agg(row_data order by sort_order, business_name), '[]'::jsonb)
  into v_subscriptions
  from (
    select
      jsonb_build_object(
        'businessId', b.id,
        'businessName', b.name,
        'plan', p.slug,
        'planName', p.name,
        'status', s.status,
        'periodEnd', s.current_period_end
      ) as row_data,
      p.sort_order,
      b.name as business_name
    from public.business_subscriptions as s
    join public.subscription_plans as p on p.id = s.plan_id
    join public.businesses as b on b.id = s.business_id
    where s.status in ('active', 'trialing', 'past_due', 'cancelled')
      and (s.current_period_end is null or s.current_period_end >= now())
  ) as listed;

  return jsonb_build_object(
    'mrr', v_mrr,
    'arr', v_mrr * 12,
    'paid_subscribers', v_pro + v_business,
    'free_subscribers', v_free,
    'pro_subscribers', v_pro,
    'business_subscribers', v_business,
    'subscriptions', v_subscriptions
  );
end;
$$;

revoke all on function public.subscription_revenue_snapshot() from public;
grant execute on function public.subscription_revenue_snapshot() to service_role;
