-- SamaGestion — catégories de dépenses, dépenses, snapshot financier dashboard

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint expense_categories_name_not_empty check (length(btrim(name)) > 0)
);

create unique index expense_categories_business_name_unique
  on public.expense_categories (business_id, lower(btrim(name)));

create index expense_categories_business_id_idx
  on public.expense_categories (business_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  category_id uuid references public.expense_categories (id) on delete restrict,
  description text not null,
  amount numeric(12, 2) not null,
  payment_method text not null,
  expense_date date not null default (timezone('Africa/Dakar', now()))::date,
  notes text,
  status text not null default 'active',
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_description_not_empty check (length(btrim(description)) > 0),
  constraint expenses_amount_positive check (amount > 0),
  constraint expenses_payment_method_check
    check (payment_method in ('cash', 'wave', 'orange_money', 'bank', 'card', 'other')),
  constraint expenses_status_check check (status in ('active', 'cancelled'))
);

create index expenses_business_id_idx on public.expenses (business_id);
create index expenses_expense_date_idx on public.expenses (business_id, expense_date desc);
create index expenses_category_id_idx on public.expenses (category_id);
create index expenses_status_idx on public.expenses (business_id, status);
create index expenses_created_at_idx on public.expenses (business_id, created_at desc);

create index if not exists sales_business_created_status_idx
  on public.sales (business_id, status, created_at desc);
create index if not exists sale_items_sale_id_idx on public.sale_items (sale_id);
create index if not exists sale_items_product_id_idx on public.sale_items (product_id);

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Catégories
-- ---------------------------------------------------------------------------

create or replace function public.ensure_default_expense_categories()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  if exists (
    select 1 from public.expense_categories where business_id = v_business_id
  ) then
    return;
  end if;

  insert into public.expense_categories (business_id, name)
  select v_business_id, category_name
  from unnest(array[
    'Loyer',
    'Transport',
    'Électricité',
    'Internet',
    'Salaires',
    'Fournitures',
    'Entretien',
    'Marketing',
    'Taxes',
    'Autre'
  ]) as category_name;
end;
$$;

create or replace function public.create_expense_category(p_name text)
returns public.expense_categories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_category public.expense_categories;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  if public.current_member_role() not in ('owner', 'manager') then
    raise exception 'FORBIDDEN';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'CATEGORY_NAME_REQUIRED';
  end if;

  insert into public.expense_categories (business_id, name)
  values (v_business_id, btrim(p_name))
  returning * into v_category;

  return v_category;
end;
$$;

create or replace function public.update_expense_category(p_category_id uuid, p_name text)
returns public.expense_categories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category public.expense_categories;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_category from public.expense_categories where id = p_category_id;

  if not found then
    raise exception 'CATEGORY_NOT_FOUND';
  end if;

  if not public.is_business_member(v_category.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  if public.current_member_role() not in ('owner', 'manager') then
    raise exception 'FORBIDDEN';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'CATEGORY_NAME_REQUIRED';
  end if;

  update public.expense_categories
  set name = btrim(p_name)
  where id = p_category_id
  returning * into v_category;

  return v_category;
end;
$$;

-- ---------------------------------------------------------------------------
-- Dépenses
-- ---------------------------------------------------------------------------

create or replace function public.create_expense(
  p_description text,
  p_category_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_expense_date date,
  p_notes text default null
)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid := public.current_business_id();
  v_expense public.expenses;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  if public.current_member_role() not in ('owner', 'manager') then
    raise exception 'FORBIDDEN';
  end if;

  if p_description is null or btrim(p_description) = '' then
    raise exception 'DESCRIPTION_REQUIRED';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if p_expense_date is null then
    raise exception 'DATE_REQUIRED';
  end if;

  if p_payment_method is null or p_payment_method not in ('cash', 'wave', 'orange_money', 'bank', 'card', 'other') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  if p_category_id is null or not exists (
    select 1 from public.expense_categories
    where id = p_category_id and business_id = v_business_id
  ) then
    raise exception 'INVALID_CATEGORY';
  end if;

  insert into public.expenses (
    business_id,
    category_id,
    description,
    amount,
    payment_method,
    expense_date,
    notes,
    created_by
  )
  values (
    v_business_id,
    p_category_id,
    btrim(p_description),
    p_amount,
    p_payment_method,
    p_expense_date,
    nullif(btrim(coalesce(p_notes, '')), ''),
    v_user_id
  )
  returning * into v_expense;

  return v_expense;
end;
$$;

create or replace function public.update_expense(
  p_expense_id uuid,
  p_description text,
  p_category_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_expense_date date,
  p_notes text default null
)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense public.expenses;
  v_business_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_expense from public.expenses where id = p_expense_id;

  if not found then
    raise exception 'EXPENSE_NOT_FOUND';
  end if;

  if not public.is_business_member(v_expense.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  if public.current_member_role() not in ('owner', 'manager') then
    raise exception 'FORBIDDEN';
  end if;

  if v_expense.status = 'cancelled' then
    raise exception 'EXPENSE_CANCELLED';
  end if;

  v_business_id := v_expense.business_id;

  if p_description is null or btrim(p_description) = '' then
    raise exception 'DESCRIPTION_REQUIRED';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if p_expense_date is null then
    raise exception 'DATE_REQUIRED';
  end if;

  if p_payment_method is null or p_payment_method not in ('cash', 'wave', 'orange_money', 'bank', 'card', 'other') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  if p_category_id is null or not exists (
    select 1 from public.expense_categories
    where id = p_category_id and business_id = v_business_id
  ) then
    raise exception 'INVALID_CATEGORY';
  end if;

  update public.expenses
  set
    description = btrim(p_description),
    category_id = p_category_id,
    amount = p_amount,
    payment_method = p_payment_method,
    expense_date = p_expense_date,
    notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_expense_id
  returning * into v_expense;

  return v_expense;
end;
$$;

create or replace function public.cancel_expense(p_expense_id uuid)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense public.expenses;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_expense from public.expenses where id = p_expense_id;

  if not found then
    raise exception 'EXPENSE_NOT_FOUND';
  end if;

  if not public.is_business_member(v_expense.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  if public.current_member_role() not in ('owner', 'manager') then
    raise exception 'FORBIDDEN';
  end if;

  if v_expense.status = 'cancelled' then
    raise exception 'EXPENSE_CANCELLED';
  end if;

  update public.expenses
  set status = 'cancelled'
  where id = p_expense_id
  returning * into v_expense;

  return v_expense;
end;
$$;

create or replace function public.get_expense_stats()
returns table (
  today numeric,
  week numeric,
  month numeric,
  total numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select
      (timezone('Africa/Dakar', now()))::date as today,
      date_trunc('week', timezone('Africa/Dakar', now()))::date as week_start,
      date_trunc('month', timezone('Africa/Dakar', now()))::date as month_start,
      public.current_business_id() as business_id
  )
  select
    coalesce(sum(e.amount) filter (where e.expense_date = b.today), 0) as today,
    coalesce(sum(e.amount) filter (where e.expense_date >= b.week_start), 0) as week,
    coalesce(sum(e.amount) filter (where e.expense_date >= b.month_start), 0) as month,
    coalesce(sum(e.amount), 0) as total
  from bounds as b
  left join public.expenses as e
    on e.business_id = b.business_id
    and e.status = 'active';
$$;

-- ---------------------------------------------------------------------------
-- Snapshot financier (une requête pour le dashboard)
-- ---------------------------------------------------------------------------

create or replace function public.financial_summary_for(
  p_business_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with sales_agg as (
    select
      coalesce(sum(s.total), 0) as revenue,
      coalesce(sum(s.amount_paid), 0) as collected,
      coalesce(sum(s.amount_due) filter (where s.customer_id is not null), 0) as receivables,
      count(*)::bigint as sales_count
    from public.sales as s
    where s.business_id = p_business_id
      and s.status = 'completed'
      and s.created_at >= p_from
      and s.created_at < p_to
  ),
  cogs_agg as (
    select coalesce(sum(si.purchase_price * si.quantity), 0) as cogs
    from public.sale_items as si
    inner join public.sales as s on s.id = si.sale_id
    where s.business_id = p_business_id
      and s.status = 'completed'
      and s.created_at >= p_from
      and s.created_at < p_to
  ),
  expense_agg as (
    select coalesce(sum(e.amount), 0) as expenses
    from public.expenses as e
    where e.business_id = p_business_id
      and e.status = 'active'
      and e.expense_date >= (p_from at time zone 'Africa/Dakar')::date
      and e.expense_date < (p_to at time zone 'Africa/Dakar')::date
  )
  select jsonb_build_object(
    'revenue', s.revenue,
    'collected', s.collected,
    'receivables', s.receivables,
    'sales_count', s.sales_count,
    'cogs', c.cogs,
    'gross_margin', s.revenue - c.cogs,
    'expenses', x.expenses,
    'net_profit', (s.revenue - c.cogs) - x.expenses,
    'avg_basket', case when s.sales_count = 0 then 0 else round(s.revenue / s.sales_count, 2) end
  )
  from sales_agg as s, cogs_agg as c, expense_agg as x;
$$;

create or replace function public.get_dashboard_bundle(
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz,
  p_prev_to timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_current jsonb;
  v_previous jsonb;
  v_top jsonb;
  v_days jsonb;
  v_activity jsonb;
  v_receivables_open numeric := 0;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  v_current := public.financial_summary_for(v_business_id, p_from, p_to);
  v_previous := public.financial_summary_for(v_business_id, p_prev_from, p_prev_to);

  select coalesce(jsonb_agg(row_to_json(ranked) order by ranked.quantity desc), '[]'::jsonb)
  into v_top
  from (
    select
      si.product_name as name,
      sum(si.quantity) as quantity
    from public.sale_items as si
    inner join public.sales as s on s.id = si.sale_id
    where s.business_id = v_business_id
      and s.status = 'completed'
      and s.created_at >= p_from
      and s.created_at < p_to
    group by si.product_name
    order by sum(si.quantity) desc
    limit 5
  ) as ranked;

  select coalesce(jsonb_agg(row_to_json(day_row) order by day_row.day), '[]'::jsonb)
  into v_days
  from (
    select
      d.day::date as day,
      coalesce(sum(s.total), 0) as revenue
    from generate_series(
      ((timezone('Africa/Dakar', now()))::date - 6)::timestamp,
      (timezone('Africa/Dakar', now()))::date::timestamp,
      interval '1 day'
    ) as d(day)
    left join public.sales as s
      on s.business_id = v_business_id
      and s.status = 'completed'
      and (s.created_at at time zone 'Africa/Dakar')::date = d.day::date
    group by d.day
  ) as day_row;

  select coalesce(sum(s.amount_due), 0)
  into v_receivables_open
  from public.sales as s
  where s.business_id = v_business_id
    and s.status = 'completed'
    and s.customer_id is not null
    and s.amount_due > 0;

  select coalesce(jsonb_agg(row_to_json(act) order by act.occurred_at desc), '[]'::jsonb)
  into v_activity
  from (
    (
      select
        s.id::text as id,
        'sale'::text as type,
        ('Vente ' || s.sale_number) as title,
        s.total as amount,
        s.created_at as occurred_at
      from public.sales as s
      where s.business_id = v_business_id
      order by s.created_at desc
      limit 8
    )
    union all
    (
      select
        e.id::text,
        'expense'::text,
        ('Dépense ' || e.description),
        -e.amount,
        e.created_at
      from public.expenses as e
      where e.business_id = v_business_id
        and e.status = 'active'
      order by e.created_at desc
      limit 8
    )
    union all
    (
      select
        m.id::text,
        'stock'::text,
        coalesce('Ajustement stock · ' || p.name, 'Ajustement stock'),
        0::numeric,
        m.created_at
      from public.stock_movements as m
      left join public.products as p on p.id = m.product_id
      where m.business_id = v_business_id
        and m.type in ('adjustment', 'purchase', 'loss')
      order by m.created_at desc
      limit 8
    )
    order by occurred_at desc
    limit 8
  ) as act;

  return jsonb_build_object(
    'current', v_current,
    'previous', v_previous,
    'receivables_open', v_receivables_open,
    'top_products', v_top,
    'revenue_days', v_days,
    'activity', v_activity
  );
end;
$$;

revoke all on function public.ensure_default_expense_categories() from public;
revoke all on function public.create_expense_category(text) from public;
revoke all on function public.update_expense_category(uuid, text) from public;
revoke all on function public.create_expense(text, uuid, numeric, text, date, text) from public;
revoke all on function public.update_expense(uuid, text, uuid, numeric, text, date, text) from public;
revoke all on function public.cancel_expense(uuid) from public;
revoke all on function public.get_expense_stats() from public;
revoke all on function public.financial_summary_for(uuid, timestamptz, timestamptz) from public;
revoke all on function public.get_dashboard_bundle(timestamptz, timestamptz, timestamptz, timestamptz) from public;

grant execute on function public.ensure_default_expense_categories() to authenticated;
grant execute on function public.create_expense_category(text) to authenticated;
grant execute on function public.update_expense_category(uuid, text) to authenticated;
grant execute on function public.create_expense(text, uuid, numeric, text, date, text) to authenticated;
grant execute on function public.update_expense(uuid, text, uuid, numeric, text, date, text) to authenticated;
grant execute on function public.cancel_expense(uuid) to authenticated;
grant execute on function public.get_expense_stats() to authenticated;
grant execute on function public.get_dashboard_bundle(timestamptz, timestamptz, timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_categories force row level security;
alter table public.expenses force row level security;

create policy "expense_categories_member_select"
  on public.expense_categories
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "expenses_member_select"
  on public.expenses
  for select
  to authenticated
  using (public.is_business_member(business_id));

grant select on table public.expense_categories to authenticated;
grant select on table public.expenses to authenticated;
