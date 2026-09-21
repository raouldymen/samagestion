-- Les vendeurs peuvent suivre les ventes envoyées à la caisse avant leur encaissement.
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
    'subtotal', coalesce(lines.subtotal, 0),
    'discount', q.discount,
    'total', greatest(coalesce(lines.subtotal, 0) - q.discount, 0),
    'createdAt', q.created_at
  ) order by q.created_at desc), '[]'::jsonb)
  from public.cashier_sale_queue q
  left join public.customers c on c.id = q.customer_id
  left join lateral (
    select sum(round(item.quantity * product.selling_price, 2)) as subtotal
    from jsonb_to_recordset(q.items) as item(product_id uuid, quantity numeric)
    join public.products product on product.id = item.product_id and product.business_id = q.business_id
  ) lines on true
  where q.business_id = public.current_business_id()
    and q.seller_id = auth.uid()
    and q.status = 'queued';
$$;

revoke all on function public.list_my_pending_cashier_sales() from public;
grant execute on function public.list_my_pending_cashier_sales() to authenticated;
