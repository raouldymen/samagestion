-- Remboursements de dettes clients : une trace par encaissement, sans modifier l'historique des ventes.
create table public.customer_debt_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  sale_id uuid not null references public.sales(id) on delete restrict,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash','wave','orange_money','bank','card','other')),
  notes text,
  received_by uuid not null references auth.users(id) on delete restrict,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index customer_debt_payments_sale_idx on public.customer_debt_payments(sale_id, paid_at desc);
create index customer_debt_payments_customer_idx on public.customer_debt_payments(customer_id, paid_at desc);
alter table public.customer_debt_payments enable row level security;
create policy "customer_debt_payments_select" on public.customer_debt_payments for select using (business_id = public.current_business_id());

create or replace function public.record_customer_debt_payment(
  p_sale_id uuid, p_amount numeric, p_payment_method text, p_notes text default null
) returns public.sales language plpgsql security definer set search_path = public as $$
declare v_sale public.sales; v_role text; v_business uuid := public.current_business_id(); v_due numeric; v_status text;
begin
  v_role := public.current_member_role();
  if v_role not in ('owner','manager','cashier') then raise exception 'FORBIDDEN'; end if;
  select * into v_sale from public.sales where id = p_sale_id and business_id = v_business for update;
  if not found or v_sale.customer_id is null or v_sale.status <> 'completed' then raise exception 'SALE_NOT_FOUND'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'INVALID_AMOUNT'; end if;
  if p_payment_method not in ('cash','wave','orange_money','bank','card','other') then raise exception 'INVALID_PAYMENT'; end if;
  if p_amount > v_sale.amount_due then raise exception 'PAYMENT_EXCEEDS_DUE'; end if;
  v_due := v_sale.amount_due - p_amount;
  v_status := case when v_due = 0 then 'paid' else 'partial' end;
  update public.sales set amount_paid = amount_paid + p_amount, amount_due = v_due, payment_status = v_status, payment_method = p_payment_method where id = v_sale.id returning * into v_sale;
  insert into public.customer_debt_payments(business_id, customer_id, sale_id, amount, payment_method, notes, received_by)
  values(v_business, v_sale.customer_id, v_sale.id, p_amount, p_payment_method, nullif(btrim(p_notes), ''), auth.uid());
  return v_sale;
end; $$;
grant execute on function public.record_customer_debt_payment(uuid,numeric,text,text) to authenticated;
