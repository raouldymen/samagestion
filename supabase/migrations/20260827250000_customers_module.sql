-- Clients : champs complets + archive + RPCs update + stats liste

alter table public.customers
  add column if not exists email text,
  add column if not exists address text,
  add column if not exists notes text,
  add column if not exists is_active boolean not null default true;

alter table public.customers
  drop constraint if exists customers_email_check;

alter table public.customers
  add constraint customers_email_check
  check (email is null or position('@' in email) > 1);

create index if not exists customers_business_active_idx
  on public.customers (business_id, is_active);

create index if not exists customers_business_phone_idx
  on public.customers (business_id, phone);

-- Compter uniquement les clients actifs pour les limites de plan
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

drop function if exists public.create_customer(text, text);

create or replace function public.create_customer(
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_address text default null,
  p_notes text default null
)
returns public.customers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_customer public.customers;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;
  if not public.has_permission('customers.create') then
    raise exception 'FORBIDDEN';
  end if;
  if p_name is null or btrim(p_name) = '' then
    raise exception 'CUSTOMER_NAME_REQUIRED';
  end if;

  perform public.assert_plan_limit('customers');

  insert into public.customers (business_id, name, phone, email, address, notes, is_active)
  values (
    v_business_id,
    btrim(p_name),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(lower(btrim(coalesce(p_email, ''))), ''),
    nullif(btrim(coalesce(p_address, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''),
    true
  )
  returning * into v_customer;

  return v_customer;
end;
$$;

create or replace function public.update_customer(
  p_customer_id uuid,
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_address text default null,
  p_notes text default null,
  p_is_active boolean default true
)
returns public.customers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_customer public.customers;
  v_was_active boolean;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;
  if not public.has_permission('customers.edit') then
    raise exception 'FORBIDDEN';
  end if;
  if p_name is null or btrim(p_name) = '' then
    raise exception 'CUSTOMER_NAME_REQUIRED';
  end if;

  select is_active into v_was_active
  from public.customers
  where id = p_customer_id and business_id = v_business_id;

  if not found then
    raise exception 'CUSTOMER_NOT_FOUND';
  end if;

  if coalesce(v_was_active, false) = false and coalesce(p_is_active, true) = true then
    perform public.assert_plan_limit('customers');
  end if;

  update public.customers
  set
    name = btrim(p_name),
    phone = nullif(btrim(coalesce(p_phone, '')), ''),
    email = nullif(lower(btrim(coalesce(p_email, ''))), ''),
    address = nullif(btrim(coalesce(p_address, '')), ''),
    notes = nullif(btrim(coalesce(p_notes, '')), ''),
    is_active = coalesce(p_is_active, true),
    updated_at = now()
  where id = p_customer_id
    and business_id = v_business_id
  returning * into v_customer;

  return v_customer;
end;
$$;

create or replace function public.set_customer_active(
  p_customer_id uuid,
  p_is_active boolean
)
returns public.customers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_customer public.customers;
begin
  if not public.has_permission('customers.edit')
     and not public.has_permission('customers.delete') then
    raise exception 'FORBIDDEN';
  end if;

  if coalesce(p_is_active, false) = true then
    perform public.assert_plan_limit('customers');
  end if;

  update public.customers
  set is_active = coalesce(p_is_active, false), updated_at = now()
  where id = p_customer_id
    and business_id = v_business_id
  returning * into v_customer;

  if not found then
    raise exception 'CUSTOMER_NOT_FOUND';
  end if;

  return v_customer;
end;
$$;

create or replace function public.list_customers_with_stats(
  p_search text default null,
  p_include_archived boolean default false
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;
  if not public.has_permission('customers.view') then
    raise exception 'FORBIDDEN';
  end if;

  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb order by t.name)
    from (
      select
        c.id,
        c.business_id,
        c.name,
        c.phone,
        c.email,
        c.address,
        c.notes,
        c.is_active,
        c.created_at,
        c.updated_at,
        coalesce(s.sales_count, 0)::integer as sales_count,
        coalesce(s.total_purchased, 0)::numeric as total_purchased,
        coalesce(s.total_paid, 0)::numeric as total_paid,
        coalesce(s.amount_due, 0)::numeric as amount_due
      from public.customers as c
      left join lateral (
        select
          count(*)::integer as sales_count,
          coalesce(sum(total), 0) as total_purchased,
          coalesce(sum(amount_paid), 0) as total_paid,
          coalesce(sum(amount_due), 0) as amount_due
        from public.sales
        where business_id = v_business_id
          and customer_id = c.id
          and status = 'completed'
      ) as s on true
      where c.business_id = v_business_id
        and (p_include_archived or c.is_active = true)
        and (
          v_search is null
          or c.name ilike '%' || v_search || '%'
          or coalesce(c.phone, '') ilike '%' || v_search || '%'
          or coalesce(c.email, '') ilike '%' || v_search || '%'
        )
      order by c.name
      limit 300
    ) as t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_customer_detail(p_customer_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_customer public.customers;
  v_stats record;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;
  if not public.has_permission('customers.view') then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_customer
  from public.customers
  where id = p_customer_id and business_id = v_business_id;

  if not found then
    return null;
  end if;

  select
    count(*)::integer as sales_count,
    coalesce(sum(total), 0) as total_purchased,
    coalesce(sum(amount_paid), 0) as total_paid,
    coalesce(sum(amount_due), 0) as amount_due
  into v_stats
  from public.sales
  where business_id = v_business_id
    and customer_id = p_customer_id
    and status = 'completed';

  return jsonb_build_object(
    'customer', jsonb_build_object(
      'id', v_customer.id,
      'business_id', v_customer.business_id,
      'name', v_customer.name,
      'phone', v_customer.phone,
      'email', v_customer.email,
      'address', v_customer.address,
      'notes', v_customer.notes,
      'is_active', v_customer.is_active,
      'created_at', v_customer.created_at,
      'updated_at', v_customer.updated_at
    ),
    'stats', jsonb_build_object(
      'sales_count', v_stats.sales_count,
      'total_purchased', v_stats.total_purchased,
      'total_paid', v_stats.total_paid,
      'amount_due', v_stats.amount_due
    ),
    'sales', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'sale_number', s.sale_number,
        'total', s.total,
        'amount_paid', s.amount_paid,
        'amount_due', s.amount_due,
        'payment_status', s.payment_status,
        'created_at', s.created_at
      ) order by s.created_at desc)
      from (
        select *
        from public.sales
        where business_id = v_business_id
          and customer_id = p_customer_id
          and status = 'completed'
        order by created_at desc
        limit 50
      ) as s
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.enforce_customers_plan_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.is_active, true) then
    perform public.assert_plan_limit('customers');
  end if;
  return new;
end;
$$;

revoke all on function public.create_customer(text, text, text, text, text) from public;
revoke all on function public.update_customer(uuid, text, text, text, text, text, boolean) from public;
revoke all on function public.set_customer_active(uuid, boolean) from public;
revoke all on function public.list_customers_with_stats(text, boolean) from public;
revoke all on function public.get_customer_detail(uuid) from public;

grant execute on function public.create_customer(text, text, text, text, text) to authenticated;
grant execute on function public.update_customer(uuid, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.set_customer_active(uuid, boolean) to authenticated;
grant execute on function public.list_customers_with_stats(text, boolean) to authenticated;
grant execute on function public.get_customer_detail(uuid) to authenticated;
