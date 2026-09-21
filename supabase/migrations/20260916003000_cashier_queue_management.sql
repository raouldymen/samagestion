-- Gestion complète des ventes en attente par la caisse.
create or replace function public.cancel_cashier_sale(p_queue_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_role text := public.current_member_role();
begin
  if auth.uid() is null or v_role not in ('owner', 'manager', 'cashier') then raise exception 'FORBIDDEN'; end if;
  if v_role <> 'cashier' and public.cashier_checkout_is_required() then raise exception 'FORBIDDEN'; end if;
  update public.cashier_sale_queue set status = 'cancelled', processed_by = auth.uid()
  where id = p_queue_id and business_id = public.current_business_id() and status = 'queued';
  if not found then raise exception 'SALE_NOT_FOUND'; end if;
end;
$$;

create or replace function public.update_cashier_sale(
  p_queue_id uuid, p_items jsonb, p_discount numeric default 0, p_customer_id uuid default null, p_notes text default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_role text := public.current_member_role(); v_item record; v_product public.products;
begin
  if auth.uid() is null or v_role not in ('owner', 'manager', 'cashier') then raise exception 'FORBIDDEN'; end if;
  if v_role <> 'cashier' and public.cashier_checkout_is_required() then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then raise exception 'SALE_ITEMS_REQUIRED'; end if;
  if coalesce(p_discount, 0) < 0 then raise exception 'INVALID_DISCOUNT'; end if;
  if p_customer_id is not null and not exists (select 1 from public.customers where id = p_customer_id and business_id = public.current_business_id()) then raise exception 'INVALID_CUSTOMER'; end if;
  for v_item in select x.product_id, sum(x.quantity) as quantity from jsonb_to_recordset(p_items) as x(product_id uuid, quantity numeric) group by x.product_id loop
    if v_item.product_id is null or coalesce(v_item.quantity, 0) <= 0 then raise exception 'INVALID_QUANTITY'; end if;
    select * into v_product from public.products where id = v_item.product_id;
    if not found or v_product.business_id <> public.current_business_id() or not v_product.is_active then raise exception 'PRODUCT_NOT_FOUND'; end if;
  end loop;
  update public.cashier_sale_queue set items = p_items, discount = coalesce(p_discount, 0), customer_id = p_customer_id, notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_queue_id and business_id = public.current_business_id() and status = 'queued';
  if not found then raise exception 'SALE_NOT_FOUND'; end if;
end;
$$;

revoke all on function public.cancel_cashier_sale(uuid) from public;
revoke all on function public.update_cashier_sale(uuid, jsonb, numeric, uuid, text) from public;
grant execute on function public.cancel_cashier_sale(uuid) to authenticated;
grant execute on function public.update_cashier_sale(uuid, jsonb, numeric, uuid, text) to authenticated;
