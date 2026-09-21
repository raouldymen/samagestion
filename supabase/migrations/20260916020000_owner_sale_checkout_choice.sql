-- Le propriétaire peut choisir de valider directement une vente ou de la confier à la caisse.
create or replace function public.enforce_cashier_checkout()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.current_member_role();
begin
  if v_role = 'seller' then raise exception 'CASHIER_CHECKOUT_REQUIRED'; end if;
  if v_role = 'manager' and public.cashier_checkout_is_required() then raise exception 'CASHIER_CHECKOUT_REQUIRED'; end if;
  if v_role = 'owner'
     and public.cashier_checkout_is_required()
     and coalesce(current_setting('app.owner_cashier_override', true), '') <> 'on' then
    raise exception 'CASHIER_CHECKOUT_REQUIRED';
  end if;
  return new;
end;
$$;

create or replace function public.create_owner_sale(
  p_items jsonb,
  p_discount numeric default 0,
  p_customer_id uuid default null,
  p_payment_method text default 'cash',
  p_amount_paid numeric default 0,
  p_notes text default null
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales;
begin
  if auth.uid() is null or public.current_member_role() <> 'owner' then
    raise exception 'FORBIDDEN';
  end if;

  perform set_config('app.owner_cashier_override', 'on', true);
  select * into v_sale from public.create_sale(
    p_items, p_discount, p_customer_id, p_payment_method, p_amount_paid, p_notes
  );
  return v_sale;
end;
$$;

revoke all on function public.enforce_cashier_checkout() from public;
revoke all on function public.create_owner_sale(jsonb, numeric, uuid, text, numeric, text) from public;
grant execute on function public.create_owner_sale(jsonb, numeric, uuid, text, numeric, text) to authenticated;
