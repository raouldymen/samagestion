-- Le vendeur peut annuler ou modifier sa propre vente encore en file d'attente.

create or replace function public.cancel_cashier_sale(p_queue_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.current_member_role();
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;

  if v_role = 'seller' then
    update public.cashier_sale_queue
    set status = 'cancelled', processed_by = auth.uid()
    where id = p_queue_id
      and business_id = public.current_business_id()
      and seller_id = auth.uid()
      and status = 'queued';
    if not found then raise exception 'SALE_NOT_FOUND'; end if;
    return;
  end if;

  if v_role not in ('owner', 'manager', 'cashier') then raise exception 'FORBIDDEN'; end if;
  if v_role <> 'cashier' and public.cashier_checkout_is_required() then raise exception 'FORBIDDEN'; end if;

  update public.cashier_sale_queue
  set status = 'cancelled', processed_by = auth.uid()
  where id = p_queue_id
    and business_id = public.current_business_id()
    and status = 'queued';
  if not found then raise exception 'SALE_NOT_FOUND'; end if;
end;
$$;

create or replace function public.update_cashier_sale(
  p_queue_id uuid,
  p_items jsonb,
  p_discount numeric default 0,
  p_customer_id uuid default null,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.current_member_role();
  v_item record;
  v_product public.products;
  v_updated int;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_role not in ('owner', 'manager', 'cashier', 'seller') then raise exception 'FORBIDDEN'; end if;
  if v_role not in ('cashier', 'seller') and public.cashier_checkout_is_required() then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then raise exception 'SALE_ITEMS_REQUIRED'; end if;
  if coalesce(p_discount, 0) < 0 then raise exception 'INVALID_DISCOUNT'; end if;
  if p_customer_id is not null and not exists (
    select 1 from public.customers
    where id = p_customer_id and business_id = public.current_business_id()
  ) then raise exception 'INVALID_CUSTOMER'; end if;

  for v_item in
    select item.product_id, sum(item.quantity) as quantity, min(item.unit_price) as unit_price
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity numeric, unit_price numeric)
    group by item.product_id
  loop
    if v_item.product_id is null or coalesce(v_item.quantity, 0) <= 0 or coalesce(v_item.unit_price, 0) <= 0 then
      raise exception 'INVALID_QUANTITY';
    end if;
    select * into v_product from public.products where id = v_item.product_id;
    if not found or v_product.business_id <> public.current_business_id() or not v_product.is_active then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;
  end loop;

  update public.cashier_sale_queue
  set items = p_items,
      discount = coalesce(p_discount, 0),
      customer_id = p_customer_id,
      notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_queue_id
    and business_id = public.current_business_id()
    and status = 'queued'
    and (v_role <> 'seller' or seller_id = auth.uid());

  get diagnostics v_updated = row_count;
  if v_updated = 0 then raise exception 'SALE_NOT_FOUND'; end if;
end;
$$;

create or replace function public.list_my_pending_cashier_sales()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'customerId', q.customer_id,
    'customerName', c.name,
    'customerPhone', c.phone,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', item.product_id,
        'name', product.name,
        'quantity', item.quantity,
        'unitPrice', coalesce(item.unit_price, product.selling_price),
        'stockQuantity', product.stock_quantity,
        'total', round(item.quantity * coalesce(item.unit_price, product.selling_price), 2)
      ) order by product.name)
      from jsonb_to_recordset(q.items) as item(product_id uuid, quantity numeric, unit_price numeric)
      join public.products product on product.id = item.product_id and product.business_id = q.business_id
    ), '[]'::jsonb),
    'subtotal', coalesce((
      select sum(round(item.quantity * coalesce(item.unit_price, product.selling_price), 2))
      from jsonb_to_recordset(q.items) as item(product_id uuid, quantity numeric, unit_price numeric)
      join public.products product on product.id = item.product_id and product.business_id = q.business_id
    ), 0),
    'discount', q.discount,
    'total', greatest(coalesce((
      select sum(round(item.quantity * coalesce(item.unit_price, product.selling_price), 2))
      from jsonb_to_recordset(q.items) as item(product_id uuid, quantity numeric, unit_price numeric)
      join public.products product on product.id = item.product_id and product.business_id = q.business_id
    ), 0) - q.discount, 0),
    'notes', q.notes,
    'createdAt', q.created_at
  ) order by q.created_at desc), '[]'::jsonb)
  from public.cashier_sale_queue q
  left join public.customers c on c.id = q.customer_id
  where q.business_id = public.current_business_id()
    and q.seller_id = auth.uid()
    and q.status = 'queued';
$$;

revoke all on function public.cancel_cashier_sale(uuid) from public;
revoke all on function public.update_cashier_sale(uuid, jsonb, numeric, uuid, text) from public;
revoke all on function public.list_my_pending_cashier_sales() from public;
grant execute on function public.cancel_cashier_sale(uuid) to authenticated;
grant execute on function public.update_cashier_sale(uuid, jsonb, numeric, uuid, text) to authenticated;
grant execute on function public.list_my_pending_cashier_sales() to authenticated;
