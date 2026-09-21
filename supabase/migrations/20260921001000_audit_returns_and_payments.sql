create or replace function public.audit_financial_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_number text; v_action text; v_entity text; v_id uuid; v_user uuid;
begin
  if TG_TABLE_NAME = 'sale_returns' then
    select sale_number into v_number from public.sales where id = new.sale_id;
    v_action := 'sale.returned'; v_entity := 'sale'; v_id := new.sale_id; v_user := new.returned_by;
  elsif TG_TABLE_NAME = 'customer_debt_payments' then
    select sale_number into v_number from public.sales where id = new.sale_id;
    v_action := 'sale.debt_paid'; v_entity := 'sale'; v_id := new.sale_id; v_user := new.received_by;
  else
    select purchase_number into v_number from public.purchases where id = new.purchase_id;
    v_action := 'purchase.debt_paid'; v_entity := 'purchase'; v_id := new.purchase_id; v_user := new.paid_by;
  end if;
  perform public.write_audit_log(v_action, v_entity, v_id, jsonb_build_object(case when v_entity='sale' then 'sale_number' else 'purchase_number' end, v_number, 'amount', new.amount), new.business_id, v_user);
  return new;
end; $$;
drop trigger if exists sale_returns_audit_activity on public.sale_returns;
create trigger sale_returns_audit_activity after insert on public.sale_returns for each row execute function public.audit_financial_activity();
drop trigger if exists customer_debt_payments_audit_activity on public.customer_debt_payments;
create trigger customer_debt_payments_audit_activity after insert on public.customer_debt_payments for each row execute function public.audit_financial_activity();
drop trigger if exists supplier_debt_payments_audit_activity on public.supplier_debt_payments;
create trigger supplier_debt_payments_audit_activity after insert on public.supplier_debt_payments for each row execute function public.audit_financial_activity();
