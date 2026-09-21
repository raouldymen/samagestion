-- Les dépenses sont visibles depuis la caisse pour rapprocher les encaissements.
create or replace function public.cashier_expenses_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'count', count(*),
    'total', coalesce(sum(amount), 0),
    'cashTotal', coalesce(sum(amount) filter (where payment_method = 'cash'), 0),
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'description', description, 'amount', amount,
      'paymentMethod', payment_method, 'createdAt', created_at
    ) order by created_at desc), '[]'::jsonb)
  )
  from public.expenses
  where business_id = public.current_business_id()
    and status = 'active'
    and expense_date = (timezone('Africa/Dakar', now()))::date;
$$;

revoke all on function public.cashier_expenses_summary() from public;
grant execute on function public.cashier_expenses_summary() to authenticated;
