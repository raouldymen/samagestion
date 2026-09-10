-- Trigger audit dédié produits : évite toute référence à new.status dans le trigger products.

create or replace function public.audit_product_from_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit_log(
      'product.created', 'product', new.id,
      jsonb_build_object('name', new.name), new.business_id, auth.uid()
    );
  elsif tg_op = 'UPDATE' then
    if new.is_active = false and old.is_active = true then
      perform public.write_audit_log(
        'product.deleted', 'product', new.id,
        jsonb_build_object('name', new.name), new.business_id, auth.uid()
      );
    elsif new.stock_quantity is not distinct from old.stock_quantity then
      perform public.write_audit_log(
        'product.updated', 'product', new.id,
        jsonb_build_object('name', new.name), new.business_id, auth.uid()
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists products_audit on public.products;
create trigger products_audit
  after insert or update on public.products
  for each row execute procedure public.audit_product_from_row();

create or replace function public.audit_customer_from_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit_log(
      'customer.created', 'customer', new.id,
      jsonb_build_object('name', new.name), new.business_id, auth.uid()
    );
  elsif tg_op = 'UPDATE' then
    perform public.write_audit_log(
      'customer.updated', 'customer', new.id,
      jsonb_build_object('name', new.name), new.business_id, auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists customers_audit on public.customers;
create trigger customers_audit
  after insert or update on public.customers
  for each row execute procedure public.audit_customer_from_row();

create or replace function public.audit_supplier_from_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_audit_log(
      'supplier.created', 'supplier', new.id,
      jsonb_build_object('name', new.name), new.business_id, auth.uid()
    );
  elsif tg_op = 'UPDATE' then
    perform public.write_audit_log(
      'supplier.updated', 'supplier', new.id,
      jsonb_build_object('name', new.name), new.business_id, auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists suppliers_audit on public.suppliers;
create trigger suppliers_audit
  after insert or update on public.suppliers
  for each row execute procedure public.audit_supplier_from_row();
