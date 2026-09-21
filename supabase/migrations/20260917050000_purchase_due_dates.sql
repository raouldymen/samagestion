alter table public.purchases add column if not exists due_date date;
create index if not exists purchases_business_due_date_idx on public.purchases(business_id, due_date) where amount_due > 0 and status = 'completed';
create or replace function public.set_purchase_due_date(p_purchase_id uuid, p_due_date date)
returns public.purchases language plpgsql security definer set search_path = public as $$
declare v_purchase public.purchases;
begin
  if public.current_member_role() not in ('owner','manager','stock_manager') then raise exception 'FORBIDDEN'; end if;
  select * into v_purchase from public.purchases where id = p_purchase_id and business_id = public.current_business_id() for update;
  if not found or v_purchase.status <> 'completed' then raise exception 'PURCHASE_NOT_FOUND'; end if;
  if v_purchase.amount_due <= 0 then raise exception 'PURCHASE_HAS_NO_DEBT'; end if;
  if p_due_date < v_purchase.purchase_date then raise exception 'INVALID_DUE_DATE'; end if;
  update public.purchases set due_date = p_due_date where id = p_purchase_id returning * into v_purchase;
  return v_purchase;
end; $$;
grant execute on function public.set_purchase_due_date(uuid,date) to authenticated;
