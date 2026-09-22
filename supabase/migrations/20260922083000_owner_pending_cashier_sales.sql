-- Le propriétaire voit les ventes encore en file de caisse dans la liste des ventes.

create or replace function public.list_my_pending_cashier_sales()
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
  left join public.profiles p on p.id = q.seller_id
  where q.business_id = public.current_business_id()
    and q.status = 'queued'
    and (
      public.current_member_role() in ('owner', 'manager')
      or q.seller_id = auth.uid()
    );
$$;

revoke all on function public.list_my_pending_cashier_sales() from public;
grant execute on function public.list_my_pending_cashier_sales() to authenticated;
