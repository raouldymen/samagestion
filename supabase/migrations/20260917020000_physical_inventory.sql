create or replace function public.apply_inventory_count(p_items jsonb)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_item jsonb; v_product public.products; v_counted numeric; v_difference numeric; v_changes integer := 0;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if not public.has_permission('stock.adjust') then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then raise exception 'INVENTORY_ITEMS_REQUIRED'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_counted := (v_item->>'counted_quantity')::numeric;
    if v_counted < 0 then raise exception 'INVALID_QUANTITY'; end if;
    select * into v_product from public.products where id = (v_item->>'product_id')::uuid for update;
    if not found or v_product.business_id <> public.current_business_id() then raise exception 'PRODUCT_NOT_FOUND'; end if;
    v_difference := v_counted - v_product.stock_quantity;
    if v_difference <> 0 then
      perform public.apply_stock_change(v_product.id, v_difference, 'adjustment', 'Inventaire physique');
      v_changes := v_changes + 1;
    end if;
  end loop;
  return v_changes;
end;
$$;
revoke all on function public.apply_inventory_count(jsonb) from public;
grant execute on function public.apply_inventory_count(jsonb) to authenticated;
