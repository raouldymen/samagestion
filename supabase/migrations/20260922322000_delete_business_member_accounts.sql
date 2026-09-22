-- Après suppression d'un commerce, retirer les comptes (et e-mails)
-- des membres qui n'appartiennent plus à aucune autre boutique.

drop function if exists public.delete_own_business();

create or replace function public.delete_own_business()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_owner_id uuid;
  v_member_ids uuid[] := '{}';
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

  select coalesce(array_agg(user_id), '{}')
  into v_member_ids
  from public.business_members
  where business_id = v_business_id;

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

  delete from auth.users as auth_user
  where auth_user.id = any(v_member_ids)
    and not exists (
      select 1 from public.business_members as remaining
      where remaining.user_id = auth_user.id
    )
    and not exists (
      select 1 from public.platform_admins as admin
      where admin.user_id = auth_user.id
    );

  return jsonb_build_object('memberIds', to_jsonb(v_member_ids));
end;
$$;

revoke all on function public.delete_own_business() from public;
grant execute on function public.delete_own_business() to authenticated;
