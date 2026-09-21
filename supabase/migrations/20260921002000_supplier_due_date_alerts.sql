create or replace function public.create_supplier_debt_alert(p_supplier_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_supplier public.suppliers; v_due numeric; v_overdue boolean;
begin
  select * into v_supplier from public.suppliers where id = p_supplier_id;
  if not found then return; end if;
  if not public.is_business_member(v_supplier.business_id) then raise exception 'FORBIDDEN'; end if;
  select coalesce(sum(amount_due),0), coalesce(bool_or(due_date is not null and due_date < (timezone('Africa/Dakar',now()))::date),false)
  into v_due,v_overdue from public.purchases where business_id=v_supplier.business_id and supplier_id=v_supplier.id and status='completed' and amount_due>0;
  if v_due <= 0 then perform public.resolve_notification_alerts(v_supplier.business_id,'supplier_debt',v_supplier.id); return; end if;
  if v_overdue then
    perform public.create_in_app_notification(v_supplier.business_id,'supplier_debt','Échéance fournisseur dépassée','Vous devez ' || public.format_fcfa_amount(v_due) || ' au fournisseur ' || v_supplier.name || '.','supplier',v_supplier.id,'high');
  end if;
end; $$;

create or replace function public.refresh_supplier_debt_alert_on_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.supplier_id is not null then perform public.create_supplier_debt_alert(new.supplier_id); end if;
  return new;
end; $$;
drop trigger if exists purchases_refresh_supplier_debt_alert on public.purchases;
create trigger purchases_refresh_supplier_debt_alert after insert or update of amount_due, due_date, status on public.purchases for each row execute function public.refresh_supplier_debt_alert_on_change();
