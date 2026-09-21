-- Les ventes finalisées deviennent non annulables 24 heures après leur création.
create or replace function public.cancel_sale(p_sale_id uuid)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale public.sales;
  v_item public.sale_items;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_sale
  from public.sales
  where id = p_sale_id
  for update;

  if not found then
    raise exception 'SALE_NOT_FOUND';
  end if;

  if not public.is_business_member(v_sale.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not (
    public.has_permission('sales.cancel', v_sale.business_id)
    or (
      public.has_permission('sales.cancel_own', v_sale.business_id)
      and v_sale.user_id = v_user_id
    )
  ) then
    raise exception 'FORBIDDEN';
  end if;

  if v_sale.status = 'cancelled' then
    raise exception 'SALE_ALREADY_CANCELLED';
  end if;

  if v_sale.created_at < now() - interval '24 hours' then
    raise exception 'SALE_CANCELLATION_WINDOW_EXPIRED';
  end if;

  for v_item in
    select * from public.sale_items
    where sale_id = v_sale.id
    order by product_id
  loop
    perform public.apply_stock_change(
      v_item.product_id,
      v_item.quantity,
      'return',
      'Annulation ' || v_sale.sale_number,
      v_sale.id
    );
  end loop;

  update public.sales
  set status = 'cancelled'
  where id = p_sale_id
  returning * into v_sale;

  return v_sale;
end;
$$;
