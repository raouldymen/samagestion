-- audit_from_row : ne référencer new.status/old.status que sur les tables qui l'ont.
-- Évite "record \"new\" has no field \"status\"" sur products/customers/etc.

create or replace function public.audit_from_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_entity text := tg_argv[0];
  v_id uuid;
  v_business uuid;
  v_meta jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := v_entity || '.created';
    v_id := new.id;
    v_business := new.business_id;
    if v_entity = 'sale' and tg_table_name = 'sales' then
      v_meta := jsonb_build_object('sale_number', new.sale_number, 'total', new.total);
    elsif v_entity = 'purchase' and tg_table_name = 'purchases' then
      v_meta := jsonb_build_object('purchase_number', new.purchase_number, 'total', new.total);
    elsif v_entity = 'product' and tg_table_name = 'products' then
      v_meta := jsonb_build_object('name', new.name);
    elsif v_entity = 'customer' and tg_table_name = 'customers' then
      v_meta := jsonb_build_object('name', new.name);
    elsif v_entity = 'supplier' and tg_table_name = 'suppliers' then
      v_meta := jsonb_build_object('name', new.name);
    elsif v_entity = 'expense' and tg_table_name = 'expenses' then
      v_meta := jsonb_build_object('description', new.description, 'amount', new.amount);
    end if;
    perform public.write_audit_log(v_action, v_entity, v_id, v_meta, v_business, auth.uid());
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if tg_table_name = 'sales' and v_entity = 'sale'
       and new.status = 'cancelled' and old.status is distinct from 'cancelled' then
      perform public.write_audit_log(
        'sale.cancelled', 'sale', new.id,
        jsonb_build_object('sale_number', new.sale_number), new.business_id, auth.uid()
      );
    elsif tg_table_name = 'purchases' and v_entity = 'purchase'
       and new.status = 'cancelled' and old.status is distinct from 'cancelled' then
      perform public.write_audit_log(
        'purchase.cancelled', 'purchase', new.id,
        jsonb_build_object('purchase_number', new.purchase_number), new.business_id, auth.uid()
      );
    elsif tg_table_name = 'expenses' and v_entity = 'expense'
       and new.status = 'cancelled' and old.status is distinct from 'cancelled' then
      perform public.write_audit_log('expense.cancelled', 'expense', new.id, '{}'::jsonb, new.business_id, auth.uid());
    elsif tg_table_name = 'expenses' and v_entity = 'expense'
       and new.status is not distinct from old.status then
      perform public.write_audit_log('expense.updated', 'expense', new.id, '{}'::jsonb, new.business_id, auth.uid());
    elsif tg_table_name = 'products' and v_entity = 'product' then
      if new.is_active = false and old.is_active = true then
        perform public.write_audit_log(
          'product.deleted', 'product', new.id, jsonb_build_object('name', new.name), new.business_id, auth.uid()
        );
      elsif new.stock_quantity is not distinct from old.stock_quantity then
        perform public.write_audit_log(
          'product.updated', 'product', new.id, jsonb_build_object('name', new.name), new.business_id, auth.uid()
        );
      end if;
    elsif tg_table_name = 'customers' and v_entity = 'customer' then
      perform public.write_audit_log('customer.updated', 'customer', new.id, jsonb_build_object('name', new.name), new.business_id, auth.uid());
    elsif tg_table_name = 'suppliers' and v_entity = 'supplier' then
      perform public.write_audit_log('supplier.updated', 'supplier', new.id, jsonb_build_object('name', new.name), new.business_id, auth.uid());
    end if;
    return new;
  end if;

  return new;
end;
$$;
