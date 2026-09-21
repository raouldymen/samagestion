-- Le caissier peut ouvrir le reçu d'une vente du jour même si elle est attribuée au vendeur.
create or replace function public.get_cashier_sale_receipt(p_sale_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sale public.sales;
begin
  if public.current_member_role() not in ('owner', 'manager', 'cashier') then
    return null;
  end if;

  select * into v_sale
  from public.sales
  where id = p_sale_id
    and business_id = public.current_business_id()
    and status = 'completed'
    and created_at >= date_trunc('day', timezone('Africa/Dakar', now())) at time zone 'Africa/Dakar';

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_sale.id,
    'businessId', v_sale.business_id,
    'customerId', v_sale.customer_id,
    'customerName', (select c.name from public.customers c where c.id = v_sale.customer_id),
    'customerPhone', (select c.phone from public.customers c where c.id = v_sale.customer_id),
    'userId', v_sale.user_id,
    'sellerName', coalesce((select p.full_name from public.profiles p where p.id = v_sale.user_id), 'Membre'),
    'saleNumber', v_sale.sale_number,
    'subtotal', v_sale.subtotal,
    'discount', v_sale.discount,
    'total', v_sale.total,
    'amountPaid', v_sale.amount_paid,
    'amountDue', v_sale.amount_due,
    'paymentStatus', v_sale.payment_status,
    'paymentMethod', v_sale.payment_method,
    'status', v_sale.status,
    'notes', v_sale.notes,
    'createdAt', v_sale.created_at,
    'updatedAt', v_sale.updated_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id,
        'saleId', item.sale_id,
        'productId', item.product_id,
        'productName', item.product_name,
        'quantity', item.quantity,
        'unitPrice', item.unit_price,
        'purchasePrice', item.purchase_price,
        'discount', item.discount,
        'total', item.total,
        'createdAt', item.created_at
      ) order by item.created_at)
      from public.sale_items item
      where item.sale_id = v_sale.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_cashier_sale_receipt(uuid) from public;
grant execute on function public.get_cashier_sale_receipt(uuid) to authenticated;
