-- Corrige la sémantique des limites plan :
--   NULL  = illimité (feature activée)
--   0     = quota numérique zéro (aucune création)
--   N     = plafond N
-- Les cas NO_BUSINESS / FORBIDDEN / FEATURE_NOT_AVAILABLE lèvent une exception
-- au lieu d'être encodés comme limit = 0.

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
    raise exception 'NO_BUSINESS';
  end if;

  if auth.uid() is not null and not public.is_business_member(v_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  v_plan_id := public.get_effective_plan_id(v_business_id);

  select enabled, limit_value into v_enabled, v_limit
  from public.subscription_plan_features
  where plan_id = v_plan_id
    and feature_key = p_feature
  limit 1;

  if not found or not coalesce(v_enabled, false) then
    raise exception 'FEATURE_NOT_AVAILABLE:%', p_feature;
  end if;

  return v_limit;
end;
$$;

create or replace function public.assert_plan_limit(p_feature text, p_business_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := coalesce(p_business_id, public.current_business_id());
  v_limit integer;
  v_usage integer;
begin
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  if auth.uid() is not null and not public.is_business_member(v_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  v_limit := public.get_plan_limit(p_feature, v_business_id);

  if v_limit is null then
    return;
  end if;

  v_usage := public.count_plan_usage(p_feature, v_business_id);

  if v_usage >= v_limit then
    raise exception 'PLAN_LIMIT_REACHED:%:%:%', p_feature, v_usage, v_limit;
  end if;
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

  if auth.uid() is not null and not public.is_business_member(v_business_id) then
    return 0;
  end if;

  if p_feature = 'products' then
    select count(*)::integer into v_count
    from public.products
    where business_id = v_business_id and is_active = true;
  elsif p_feature = 'customers' then
    select count(*)::integer into v_count
    from public.customers
    where business_id = v_business_id and is_active = true;
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

-- Triggers : utiliser le business_id de la ligne, pas seulement current_business_id()
create or replace function public.enforce_products_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_active is distinct from false then
    perform public.assert_plan_limit('products', new.business_id);
  end if;
  return new;
end;
$$;

create or replace function public.enforce_customers_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_plan_limit('customers', new.business_id);
  return new;
end;
$$;

create or replace function public.enforce_sales_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed' then
    perform public.assert_plan_limit('sales_monthly', new.business_id);
  end if;
  return new;
end;
$$;

grant execute on function public.assert_plan_limit(text, uuid) to authenticated;
grant execute on function public.get_plan_limit(text, uuid) to authenticated;
grant execute on function public.count_plan_usage(text, uuid) to authenticated;
