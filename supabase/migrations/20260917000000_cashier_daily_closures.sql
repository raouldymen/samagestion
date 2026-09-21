-- Clôture quotidienne : le caissier compare l'argent réellement compté
-- aux espèces encaissées, après les dépenses réglées en espèces.
create table if not exists public.cashier_daily_closures (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  cashier_id uuid not null references auth.users(id) on delete restrict,
  cash_date date not null default (timezone('Africa/Dakar', now()))::date,
  expected_amount numeric(12,2) not null,
  counted_amount numeric(12,2) not null check (counted_amount >= 0),
  difference_amount numeric(12,2) not null,
  notes text,
  closed_at timestamptz not null default now(),
  unique (business_id, cashier_id, cash_date)
);

create index if not exists cashier_daily_closures_business_date_idx
  on public.cashier_daily_closures (business_id, cash_date desc);

alter table public.cashier_daily_closures enable row level security;
alter table public.cashier_daily_closures force row level security;
revoke all on table public.cashier_daily_closures from anon, authenticated;

create or replace function public.cashier_closure_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select
      (timezone('Africa/Dakar', now()))::date as cash_date,
      date_trunc('day', timezone('Africa/Dakar', now())) at time zone 'Africa/Dakar' as starts_at
  ), cash_sales as (
    select coalesce(sum(amount_paid), 0) as amount
    from (
      select s.amount_paid
      from public.cashier_sale_queue q
      join public.sales s on s.id = q.completed_sale_id
      cross join bounds b
      where q.business_id = public.current_business_id()
        and q.status = 'completed'
        and q.processed_by = auth.uid()
        and s.status = 'completed'
        and s.payment_method = 'cash'
        and s.created_at >= b.starts_at
      union all
      select s.amount_paid
      from public.sales s
      cross join bounds b
      where s.business_id = public.current_business_id()
        and s.user_id = auth.uid()
        and s.status = 'completed'
        and s.payment_method = 'cash'
        and s.created_at >= b.starts_at
        and not exists (select 1 from public.cashier_sale_queue q where q.completed_sale_id = s.id)
      union all
      select collection.amount
      from public.owner_sale_cashier_collections collection
      join public.sales s on s.id = collection.sale_id
      cross join bounds b
      where collection.business_id = public.current_business_id()
        and collection.status = 'collected'
        and collection.collected_by = auth.uid()
        and s.payment_method = 'cash'
        and collection.collected_at >= b.starts_at
    ) as entries
  ), cash_expenses as (
    select coalesce(sum(e.amount), 0) as amount
    from public.expenses e
    cross join bounds b
    where e.business_id = public.current_business_id()
      and e.status = 'active'
      and e.payment_method = 'cash'
      and e.expense_date = b.cash_date
  ), closure as (
    select c.*
    from public.cashier_daily_closures c
    cross join bounds b
    where c.business_id = public.current_business_id()
      and c.cashier_id = auth.uid()
      and c.cash_date = b.cash_date
  )
  select jsonb_build_object(
    'cashDate', (select cash_date from bounds),
    'cashSales', (select amount from cash_sales),
    'cashExpenses', (select amount from cash_expenses),
    'expectedAmount', (select amount from cash_sales) - (select amount from cash_expenses),
    'closed', exists(select 1 from closure),
    'countedAmount', (select counted_amount from closure),
    'differenceAmount', (select difference_amount from closure),
    'closedAt', (select closed_at from closure)
  );
$$;

create or replace function public.close_cashier_day(p_counted_amount numeric, p_notes text default null)
returns public.cashier_daily_closures
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_expected numeric(12,2);
  v_closure public.cashier_daily_closures;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_business_id is null then raise exception 'NO_BUSINESS'; end if;
  if public.current_member_role() <> 'cashier' then raise exception 'FORBIDDEN'; end if;
  if p_counted_amount is null or p_counted_amount < 0 then raise exception 'INVALID_COUNTED_AMOUNT'; end if;

  select coalesce((public.cashier_closure_summary()->>'expectedAmount')::numeric, 0) into v_expected;

  insert into public.cashier_daily_closures (
    business_id, cashier_id, cash_date, expected_amount, counted_amount, difference_amount, notes
  ) values (
    v_business_id, auth.uid(), (timezone('Africa/Dakar', now()))::date, v_expected,
    p_counted_amount, p_counted_amount - v_expected, nullif(btrim(coalesce(p_notes, '')), '')
  ) returning * into v_closure;

  return v_closure;
exception when unique_violation then
  raise exception 'CASH_DAY_ALREADY_CLOSED';
end;
$$;

create or replace function public.list_cashier_daily_closures()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'cashDate', c.cash_date, 'cashierName', coalesce(p.full_name, 'Caisse'),
    'expectedAmount', c.expected_amount, 'countedAmount', c.counted_amount,
    'differenceAmount', c.difference_amount, 'notes', c.notes, 'closedAt', c.closed_at
  ) order by c.cash_date desc, c.closed_at desc), '[]'::jsonb)
  from public.cashier_daily_closures c
  left join public.profiles p on p.id = c.cashier_id
  where c.business_id = public.current_business_id()
    and public.current_member_role() in ('owner', 'manager', 'cashier')
    and (public.current_member_role() in ('owner', 'manager') or c.cashier_id = auth.uid())
  limit 100;
$$;

revoke all on function public.cashier_closure_summary() from public;
revoke all on function public.close_cashier_day(numeric, text) from public;
revoke all on function public.list_cashier_daily_closures() from public;
grant execute on function public.cashier_closure_summary() to authenticated;
grant execute on function public.close_cashier_day(numeric, text) to authenticated;
grant execute on function public.list_cashier_daily_closures() to authenticated;
