-- Retour complet d'une vente : le stock est restauré et un avoir est conservé.
create table public.sale_returns (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  sale_id uuid not null unique references public.sales(id) on delete restrict,
  amount numeric(12,2) not null check (amount >= 0),
  reason text,
  returned_by uuid not null references auth.users(id) on delete restrict,
  returned_at timestamptz not null default now()
);
create index sale_returns_business_idx on public.sale_returns(business_id, returned_at desc);
alter table public.sale_returns enable row level security;
create policy "sale_returns_member_select" on public.sale_returns for select using (business_id = public.current_business_id());

create or replace function public.return_sale_for_credit(p_sale_id uuid, p_reason text default null)
returns public.sale_returns language plpgsql security definer set search_path = public as $$
declare v_sale public.sales; v_item public.sale_items; v_return public.sale_returns; v_business uuid := public.current_business_id();
begin
  if public.current_member_role() not in ('owner','manager','cashier') then raise exception 'FORBIDDEN'; end if;
  select * into v_sale from public.sales where id = p_sale_id and business_id = v_business for update;
  if not found or v_sale.status <> 'completed' then raise exception 'SALE_NOT_FOUND'; end if;
  if exists(select 1 from public.sale_returns where sale_id = p_sale_id) then raise exception 'SALE_ALREADY_RETURNED'; end if;
  for v_item in select * from public.sale_items where sale_id = p_sale_id loop
    perform public.apply_stock_change(v_item.product_id, v_item.quantity, 'return', 'Retour / avoir ' || v_sale.sale_number, v_sale.id);
  end loop;
  insert into public.sale_returns(business_id, sale_id, amount, reason, returned_by)
  values(v_business, p_sale_id, v_sale.total, nullif(btrim(p_reason), ''), auth.uid()) returning * into v_return;
  return v_return;
end; $$;
grant execute on function public.return_sale_for_credit(uuid,text) to authenticated;
