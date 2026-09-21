-- Un caissier actif est le seul à valider les ventes ; owner/manager prennent le relais sinon.
create or replace function public.cashier_checkout_is_required()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.business_members
    where business_id = public.current_business_id() and role = 'cashier' and status = 'active'
  );
$$;

create or replace function public.queue_sale_for_cashier(
  p_items jsonb, p_discount numeric default 0, p_customer_id uuid default null, p_notes text default null
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_business_id uuid := public.current_business_id(); v_item record; v_product public.products; v_queue public.cashier_sale_queue;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_business_id is null then raise exception 'NO_BUSINESS'; end if;
  if public.current_member_role() not in ('owner', 'manager', 'seller') then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then raise exception 'SALE_ITEMS_REQUIRED'; end if;
  if coalesce(p_discount, 0) < 0 then raise exception 'INVALID_DISCOUNT'; end if;
  if p_customer_id is not null and not exists (select 1 from public.customers where id = p_customer_id and business_id = v_business_id) then raise exception 'INVALID_CUSTOMER'; end if;
  for v_item in select x.product_id, sum(x.quantity) as quantity from jsonb_to_recordset(p_items) as x(product_id uuid, quantity numeric) group by x.product_id loop
    if v_item.product_id is null or coalesce(v_item.quantity, 0) <= 0 then raise exception 'INVALID_QUANTITY'; end if;
    select * into v_product from public.products where id = v_item.product_id for share;
    if not found or v_product.business_id is distinct from v_business_id then raise exception 'PRODUCT_NOT_FOUND'; end if;
    if not v_product.is_active then raise exception 'PRODUCT_INACTIVE'; end if;
  end loop;
  insert into public.cashier_sale_queue (business_id, seller_id, customer_id, items, discount, notes)
  values (v_business_id, auth.uid(), p_customer_id, p_items, coalesce(p_discount, 0), nullif(btrim(coalesce(p_notes, '')), '')) returning * into v_queue;
  return jsonb_build_object('id', v_queue.id, 'status', v_queue.status);
end;
$$;

create or replace function public.complete_cashier_sale(p_queue_id uuid, p_payment_method text, p_amount_paid numeric)
returns public.sales language plpgsql security definer set search_path = public as $$
declare v_queue public.cashier_sale_queue; v_sale public.sales; v_role text := public.current_member_role();
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_role not in ('owner', 'manager', 'cashier') then raise exception 'FORBIDDEN'; end if;
  if v_role <> 'cashier' and public.cashier_checkout_is_required() then raise exception 'FORBIDDEN'; end if;
  select * into v_queue from public.cashier_sale_queue where id = p_queue_id and business_id = public.current_business_id() for update;
  if not found or v_queue.status <> 'queued' then raise exception 'SALE_NOT_FOUND'; end if;
  select * into v_sale from public.create_sale(v_queue.items, v_queue.discount, v_queue.customer_id, p_payment_method, p_amount_paid, v_queue.notes);
  update public.sales set user_id = v_queue.seller_id where id = v_sale.id returning * into v_sale;
  update public.cashier_sale_queue set status = 'completed', processed_by = auth.uid(), completed_sale_id = v_sale.id where id = v_queue.id;
  return v_sale;
end;
$$;

revoke all on function public.cashier_checkout_is_required() from public;
grant execute on function public.cashier_checkout_is_required() to authenticated;
