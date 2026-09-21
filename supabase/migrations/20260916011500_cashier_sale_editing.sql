-- La caisse peut ajuster une commande avant son encaissement, sans modifier le tarif général des produits.
create or replace function public.list_cashier_sale_queue()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'sellerName', coalesce(p.full_name, 'Vendeur'),
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
    'notes', q.notes,
    'createdAt', q.created_at
  ) order by q.created_at asc), '[]'::jsonb)
  from public.cashier_sale_queue q
  left join public.profiles p on p.id = q.seller_id
  left join public.customers c on c.id = q.customer_id
  where q.business_id = public.current_business_id()
    and q.status = 'queued'
    and public.current_member_role() in ('owner', 'manager', 'cashier');
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
begin
  if auth.uid() is null or v_role not in ('owner', 'manager', 'cashier') then raise exception 'FORBIDDEN'; end if;
  if v_role <> 'cashier' and public.cashier_checkout_is_required() then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then raise exception 'SALE_ITEMS_REQUIRED'; end if;
  if coalesce(p_discount, 0) < 0 then raise exception 'INVALID_DISCOUNT'; end if;
  if p_customer_id is not null and not exists (select 1 from public.customers where id = p_customer_id and business_id = public.current_business_id()) then raise exception 'INVALID_CUSTOMER'; end if;

  for v_item in
    select item.product_id, sum(item.quantity) as quantity, min(item.unit_price) as unit_price
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity numeric, unit_price numeric)
    group by item.product_id
  loop
    if v_item.product_id is null or coalesce(v_item.quantity, 0) <= 0 or coalesce(v_item.unit_price, 0) <= 0 then raise exception 'INVALID_QUANTITY'; end if;
    select * into v_product from public.products where id = v_item.product_id;
    if not found or v_product.business_id <> public.current_business_id() or not v_product.is_active then raise exception 'PRODUCT_NOT_FOUND'; end if;
  end loop;

  update public.cashier_sale_queue
  set items = p_items,
      discount = coalesce(p_discount, 0),
      customer_id = p_customer_id,
      notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_queue_id and business_id = public.current_business_id() and status = 'queued';
  if not found then raise exception 'SALE_NOT_FOUND'; end if;
end;
$$;

create or replace function public.complete_cashier_sale(
  p_queue_id uuid,
  p_payment_method text,
  p_amount_paid numeric
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_queue public.cashier_sale_queue;
  v_sale public.sales;
  v_role text := public.current_member_role();
  v_item record;
  v_product public.products;
  v_subtotal numeric := 0;
  v_total numeric;
  v_amount_paid numeric := coalesce(p_amount_paid, 0);
  v_amount_due numeric;
  v_payment_status text;
  v_unit_price numeric;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_role not in ('owner', 'manager', 'cashier') then raise exception 'FORBIDDEN'; end if;
  if v_role <> 'cashier' and public.cashier_checkout_is_required() then raise exception 'FORBIDDEN'; end if;
  if p_payment_method not in ('cash', 'wave', 'orange_money', 'bank', 'card', 'other') or v_amount_paid < 0 then raise exception 'INVALID_PAYMENT'; end if;

  select * into v_queue from public.cashier_sale_queue
  where id = p_queue_id and business_id = public.current_business_id()
  for update;
  if not found or v_queue.status <> 'queued' then raise exception 'SALE_NOT_FOUND'; end if;

  for v_item in
    select item.product_id, sum(item.quantity) as quantity, min(item.unit_price) as unit_price
    from jsonb_to_recordset(v_queue.items) as item(product_id uuid, quantity numeric, unit_price numeric)
    group by item.product_id
  loop
    if v_item.product_id is null or coalesce(v_item.quantity, 0) <= 0 or (v_item.unit_price is not null and v_item.unit_price <= 0) then raise exception 'INVALID_QUANTITY'; end if;
    select * into v_product from public.products where id = v_item.product_id and business_id = v_queue.business_id;
    if not found or not v_product.is_active then raise exception 'PRODUCT_NOT_FOUND'; end if;
    v_unit_price := coalesce(v_item.unit_price, v_product.selling_price);
    v_subtotal := v_subtotal + round(v_item.quantity * v_unit_price, 2);
  end loop;

  if v_subtotal <= 0 or v_queue.discount > v_subtotal then raise exception 'INVALID_DISCOUNT'; end if;
  v_total := v_subtotal - v_queue.discount;
  if v_amount_paid > v_total then raise exception 'PAYMENT_EXCEEDS_TOTAL'; end if;
  v_amount_due := v_total - v_amount_paid;
  v_payment_status := case when v_amount_due = 0 then 'paid' when v_amount_paid > 0 then 'partial' else 'unpaid' end;

  -- La fonction standard gère le stock et les mouvements; les montants sont ensuite remplacés par les tarifs décidés en caisse.
  select * into v_sale from public.create_sale(v_queue.items, 0, v_queue.customer_id, p_payment_method, 0, v_queue.notes);

  for v_item in
    select item.product_id, sum(item.quantity) as quantity, coalesce(min(item.unit_price), product.selling_price) as unit_price
    from jsonb_to_recordset(v_queue.items) as item(product_id uuid, quantity numeric, unit_price numeric)
    join public.products product on product.id = item.product_id and product.business_id = v_queue.business_id
    group by item.product_id, product.selling_price
  loop
    update public.sale_items
    set unit_price = v_item.unit_price,
        total = round(v_item.quantity * v_item.unit_price, 2)
    where sale_id = v_sale.id and product_id = v_item.product_id;
  end loop;

  update public.sales
  set user_id = v_queue.seller_id,
      subtotal = v_subtotal,
      discount = v_queue.discount,
      total = v_total,
      amount_paid = v_amount_paid,
      amount_due = v_amount_due,
      payment_status = v_payment_status,
      payment_method = p_payment_method
  where id = v_sale.id
  returning * into v_sale;

  update public.cashier_sale_queue
  set status = 'completed', processed_by = auth.uid(), completed_sale_id = v_sale.id
  where id = v_queue.id;

  return v_sale;
end;
$$;

revoke all on function public.list_cashier_sale_queue() from public;
revoke all on function public.update_cashier_sale(uuid, jsonb, numeric, uuid, text) from public;
revoke all on function public.complete_cashier_sale(uuid, text, numeric) from public;
grant execute on function public.list_cashier_sale_queue() to authenticated;
grant execute on function public.update_cashier_sale(uuid, jsonb, numeric, uuid, text) to authenticated;
grant execute on function public.complete_cashier_sale(uuid, text, numeric) to authenticated;
