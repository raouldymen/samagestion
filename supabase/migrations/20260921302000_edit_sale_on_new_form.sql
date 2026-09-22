-- La modification d'une vente en file rouvre le formulaire, pas un éditeur dans la caisse.
-- Le caissier peut renvoyer la vente corrigée au nom du vendeur d'origine.

drop function if exists public.queue_sale_for_cashier(jsonb, numeric, uuid, text);

create function public.queue_sale_for_cashier(
  p_items jsonb,
  p_discount numeric default 0,
  p_customer_id uuid default null,
  p_notes text default null,
  p_seller_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_role text := public.current_member_role();
  v_seller_id uuid := auth.uid();
  v_item record;
  v_product public.products;
  v_queue public.cashier_sale_queue;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_business_id is null then raise exception 'NO_BUSINESS'; end if;
  if v_role not in ('owner', 'manager', 'seller', 'cashier') then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then raise exception 'SALE_ITEMS_REQUIRED'; end if;
  if coalesce(p_discount, 0) < 0 then raise exception 'INVALID_DISCOUNT'; end if;
  if p_customer_id is not null and not exists (
    select 1 from public.customers where id = p_customer_id and business_id = v_business_id
  ) then raise exception 'INVALID_CUSTOMER'; end if;

  if v_role <> 'seller' and p_seller_id is not null then
    if not exists (
      select 1 from public.business_members
      where business_id = v_business_id and user_id = p_seller_id and status = 'active'
    ) then raise exception 'FORBIDDEN'; end if;
    v_seller_id := p_seller_id;
  end if;

  for v_item in
    select x.product_id, sum(x.quantity) as quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity numeric)
    group by x.product_id
  loop
    if v_item.product_id is null or coalesce(v_item.quantity, 0) <= 0 then raise exception 'INVALID_QUANTITY'; end if;
    select * into v_product from public.products where id = v_item.product_id for share;
    if not found or v_product.business_id is distinct from v_business_id then raise exception 'PRODUCT_NOT_FOUND'; end if;
    if not v_product.is_active then raise exception 'PRODUCT_INACTIVE'; end if;
  end loop;

  insert into public.cashier_sale_queue (business_id, seller_id, customer_id, items, discount, notes)
  values (v_business_id, v_seller_id, p_customer_id, p_items, coalesce(p_discount, 0), nullif(btrim(coalesce(p_notes, '')), ''))
  returning * into v_queue;

  return jsonb_build_object('id', v_queue.id, 'status', v_queue.status);
end;
$$;

create or replace function public.list_cashier_sale_queue()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'sellerId', q.seller_id,
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

revoke all on function public.queue_sale_for_cashier(jsonb, numeric, uuid, text, uuid) from public;
revoke all on function public.list_cashier_sale_queue() from public;
grant execute on function public.queue_sale_for_cashier(jsonb, numeric, uuid, text, uuid) to authenticated;
grant execute on function public.list_cashier_sale_queue() to authenticated;
