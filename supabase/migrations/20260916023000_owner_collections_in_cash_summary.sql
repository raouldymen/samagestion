-- Les ventes du propriétaire réellement reçues par la caisse entrent dans les encaissements du jour.
create or replace function public.cashier_checkout_summary()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with completed as (
    select s.id, s.sale_number, s.amount_paid, s.payment_method, s.created_at
    from public.cashier_sale_queue q
    join public.sales s on s.id = q.completed_sale_id
    where q.business_id = public.current_business_id()
      and q.status = 'completed'
      and s.status = 'completed'
      and s.created_at >= date_trunc('day', timezone('Africa/Dakar', now())) at time zone 'Africa/Dakar'
      and (
        public.current_member_role() in ('owner', 'manager')
        or q.processed_by = auth.uid()
      )

    union all

    select s.id, s.sale_number, s.amount_paid, s.payment_method, s.created_at
    from public.sales s
    where s.business_id = public.current_business_id()
      and s.status = 'completed'
      and s.created_at >= date_trunc('day', timezone('Africa/Dakar', now())) at time zone 'Africa/Dakar'
      and s.user_id = auth.uid()
      and not exists (select 1 from public.cashier_sale_queue q where q.completed_sale_id = s.id)

    union all

    select s.id, s.sale_number, collection.amount, s.payment_method, collection.collected_at
    from public.owner_sale_cashier_collections collection
    join public.sales s on s.id = collection.sale_id
    where collection.business_id = public.current_business_id()
      and collection.status = 'collected'
      and collection.collected_at >= date_trunc('day', timezone('Africa/Dakar', now())) at time zone 'Africa/Dakar'
      and (
        public.current_member_role() in ('owner', 'manager')
        or collection.collected_by = auth.uid()
      )
      and not (
        s.user_id = auth.uid()
        and public.current_member_role() in ('owner', 'manager')
      )
  )
  select jsonb_build_object(
    'count', count(*),
    'total', coalesce(sum(amount_paid), 0),
    'byMethod', coalesce(jsonb_object_agg(coalesce(payment_method, 'other'), method_total), '{}'::jsonb),
    'sales', coalesce(jsonb_agg(jsonb_build_object(
      'id', id, 'saleNumber', sale_number, 'amountPaid', amount_paid,
      'paymentMethod', payment_method, 'createdAt', created_at
    ) order by created_at desc), '[]'::jsonb)
  )
  from (
    select *, sum(amount_paid) over (partition by payment_method) as method_total
    from completed
  ) summary;
$$;

revoke all on function public.cashier_checkout_summary() from public;
grant execute on function public.cashier_checkout_summary() to authenticated;
