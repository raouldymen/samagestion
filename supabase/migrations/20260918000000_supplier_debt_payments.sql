create table public.supplier_debt_payments (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id) on delete cascade,
 supplier_id uuid not null references public.suppliers(id) on delete restrict, purchase_id uuid not null references public.purchases(id) on delete restrict,
 amount numeric(12,2) not null check(amount > 0), payment_method text not null check(payment_method in ('cash','wave','orange_money','bank','card','other')),
 paid_by uuid not null references auth.users(id) on delete restrict, paid_at timestamptz not null default now());
create index supplier_debt_payments_purchase_idx on public.supplier_debt_payments(purchase_id, paid_at desc);
alter table public.supplier_debt_payments enable row level security;
create policy "supplier_debt_payments_select" on public.supplier_debt_payments for select using (business_id = public.current_business_id());
create or replace function public.record_supplier_debt_payment(p_purchase_id uuid, p_amount numeric, p_payment_method text)
returns public.purchases language plpgsql security definer set search_path = public as $$
declare v public.purchases; v_due numeric; v_status text;
begin
 if public.current_member_role() not in ('owner','manager','stock_manager') then raise exception 'FORBIDDEN'; end if;
 select * into v from public.purchases where id=p_purchase_id and business_id=public.current_business_id() for update;
 if not found or v.status <> 'completed' or v.supplier_id is null then raise exception 'PURCHASE_NOT_FOUND'; end if;
 if p_amount is null or p_amount <= 0 or p_amount > v.amount_due then raise exception 'INVALID_AMOUNT'; end if;
 if p_payment_method not in ('cash','wave','orange_money','bank','card','other') then raise exception 'INVALID_PAYMENT'; end if;
 v_due := v.amount_due-p_amount; v_status := case when v_due=0 then 'paid' else 'partial' end;
 update public.purchases set amount_paid=amount_paid+p_amount, amount_due=v_due, payment_status=v_status where id=v.id returning * into v;
 insert into public.supplier_debt_payments(business_id,supplier_id,purchase_id,amount,payment_method,paid_by) values(v.business_id,v.supplier_id,v.id,p_amount,p_payment_method,auth.uid());
 return v;
end; $$;
grant execute on function public.record_supplier_debt_payment(uuid,numeric,text) to authenticated;
