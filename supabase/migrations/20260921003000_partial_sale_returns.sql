-- Plusieurs retours partiels sont possibles pour une même vente.
alter table public.sale_returns drop constraint if exists sale_returns_sale_id_key;
create table public.sale_return_items (
  id uuid primary key default gen_random_uuid(), return_id uuid not null references public.sale_returns(id) on delete cascade,
  sale_item_id uuid not null references public.sale_items(id) on delete restrict, product_id uuid not null references public.products(id) on delete restrict,
  quantity numeric(12,3) not null check(quantity > 0), amount numeric(12,2) not null check(amount >= 0)
);
create index sale_return_items_sale_item_idx on public.sale_return_items(sale_item_id);
alter table public.sale_return_items enable row level security;
create policy "sale_return_items_member_select" on public.sale_return_items for select using (exists(select 1 from public.sale_returns r where r.id=return_id and r.business_id=public.current_business_id()));

create or replace function public.return_sale_items(p_sale_id uuid, p_items jsonb, p_reason text default null)
returns public.sale_returns language plpgsql security definer set search_path=public as $$
declare v_sale public.sales; v_item public.sale_items; v_return public.sale_returns; v_raw jsonb; v_qty numeric; v_returned numeric; v_amount numeric := 0;
begin
  if public.current_member_role() not in ('owner','manager','cashier') then raise exception 'FORBIDDEN'; end if;
  select * into v_sale from public.sales where id=p_sale_id and business_id=public.current_business_id() for update;
  if not found or v_sale.status <> 'completed' then raise exception 'SALE_NOT_FOUND'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'RETURN_ITEMS_REQUIRED'; end if;
  insert into public.sale_returns(business_id,sale_id,amount,reason,returned_by) values(v_sale.business_id,p_sale_id,0,nullif(btrim(p_reason),''),auth.uid()) returning * into v_return;
  for v_raw in select value from jsonb_array_elements(p_items) loop
    select * into v_item from public.sale_items where id=(v_raw->>'sale_item_id')::uuid and sale_id=p_sale_id for update;
    if not found then raise exception 'INVALID_RETURN_ITEM'; end if;
    v_qty := (v_raw->>'quantity')::numeric;
    if v_qty is null or v_qty <= 0 then raise exception 'INVALID_RETURN_QUANTITY'; end if;
    select coalesce(sum(quantity),0) into v_returned from public.sale_return_items where sale_item_id=v_item.id;
    if v_returned + v_qty > v_item.quantity then raise exception 'RETURN_QUANTITY_EXCEEDS_SOLD'; end if;
    insert into public.sale_return_items(return_id,sale_item_id,product_id,quantity,amount) values(v_return.id,v_item.id,v_item.product_id,v_qty,round((v_item.total / v_item.quantity) * v_qty,2));
    perform public.apply_stock_change(v_item.product_id,v_qty,'return','Retour partiel / avoir '||v_sale.sale_number,v_sale.id);
    v_amount := v_amount + round((v_item.total / v_item.quantity) * v_qty,2);
  end loop;
  update public.sale_returns set amount=v_amount where id=v_return.id returning * into v_return;
  return v_return;
end; $$;
grant execute on function public.return_sale_items(uuid,jsonb,text) to authenticated;
