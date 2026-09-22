-- La suppression du commerce échouait :
-- 1. le trigger protège le membre owner (OWNER_PROTECTED)
-- 2. des FK RESTRICT (lignes de vente, stock, retours, dettes) bloquent le cascade

create or replace function public.protect_primary_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_deleting text := current_setting('samagestion.deleting_business', true);
begin
  if tg_op = 'DELETE' and v_deleting is not null and v_deleting = old.business_id::text then
    return old;
  end if;

  select owner_id into v_owner from public.businesses where id = coalesce(new.business_id, old.business_id);

  if tg_op = 'DELETE' then
    if old.role = 'owner' or old.user_id = v_owner then
      raise exception 'OWNER_PROTECTED';
    end if;
    return old;
  end if;

  if old.role = 'owner' or old.user_id = v_owner then
    if new.role is distinct from 'owner' then
      raise exception 'OWNER_PROTECTED';
    end if;
    if new.status is distinct from 'active' then
      raise exception 'OWNER_PROTECTED';
    end if;
    if new.user_id is distinct from old.user_id then
      raise exception 'OWNER_PROTECTED';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.delete_own_business()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  if public.current_member_role() is distinct from 'owner' then
    raise exception 'FORBIDDEN';
  end if;

  select owner_id into v_owner_id
  from public.businesses
  where id = v_business_id;

  if not found then
    raise exception 'NO_BUSINESS';
  end if;

  if v_owner_id is not null and v_owner_id <> auth.uid() then
    raise exception 'FORBIDDEN';
  end if;

  perform set_config('samagestion.deleting_business', v_business_id::text, true);

  delete from public.sale_return_items as item
  using public.sale_returns as ret
  where item.return_id = ret.id
    and ret.business_id = v_business_id;

  delete from public.sale_returns where business_id = v_business_id;
  delete from public.customer_debt_payments where business_id = v_business_id;

  delete from public.sale_items as item
  using public.sales as sale
  where item.sale_id = sale.id
    and sale.business_id = v_business_id;

  delete from public.supplier_debt_payments where business_id = v_business_id;

  delete from public.purchase_items as item
  using public.purchases as purchase
  where item.purchase_id = purchase.id
    and purchase.business_id = v_business_id;

  delete from public.stock_movements where business_id = v_business_id;
  delete from public.expenses where business_id = v_business_id;

  delete from public.businesses where id = v_business_id;
end;
$$;
