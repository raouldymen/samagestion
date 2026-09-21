-- La caisse peut consulter les ventes finalisées de la journée, sans accès à l'historique complet.
create or replace function public.list_cashier_today_sales()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', sale.id,
    'saleNumber', sale.sale_number,
    'sellerName', coalesce(profile.full_name, 'Membre'),
    'amountPaid', sale.amount_paid,
    'paymentStatus', sale.payment_status,
    'createdAt', sale.created_at
  ) order by sale.created_at desc), '[]'::jsonb)
  from public.sales sale
  left join public.profiles profile on profile.id = sale.user_id
  where sale.business_id = public.current_business_id()
    and sale.status = 'completed'
    and sale.created_at >= date_trunc('day', timezone('Africa/Dakar', now())) at time zone 'Africa/Dakar'
    and public.current_member_role() in ('owner', 'manager', 'cashier');
$$;

revoke all on function public.list_cashier_today_sales() from public;
grant execute on function public.list_cashier_today_sales() to authenticated;
