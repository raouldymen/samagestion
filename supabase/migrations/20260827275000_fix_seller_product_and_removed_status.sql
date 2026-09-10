-- Corrige : vendeur pouvait update_product via RPC security definer
-- Corrige : statut 'removed' absent du check → update silencieuse échouait

alter table public.business_members
  drop constraint if exists business_members_status_check;

alter table public.business_members
  add constraint business_members_status_check
  check (status in ('active', 'invited', 'suspended', 'removed'));

create or replace function public.update_product(
  p_product_id uuid,
  p_name text,
  p_category_id uuid default null,
  p_sku text default null,
  p_description text default null,
  p_purchase_price numeric default 0,
  p_selling_price numeric default 0,
  p_minimum_stock numeric default 0,
  p_unit text default 'piece',
  p_image_url text default null,
  p_is_active boolean default true
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
  v_business_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_product from public.products where id = p_product_id;

  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  v_business_id := v_product.business_id;

  if not public.is_business_member(v_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not public.has_permission('products.edit', v_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'PRODUCT_NAME_REQUIRED';
  end if;

  if p_purchase_price < 0 or p_selling_price < 0 or p_minimum_stock < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if p_category_id is not null and not exists (
    select 1 from public.categories
    where id = p_category_id and business_id = v_business_id
  ) then
    raise exception 'INVALID_CATEGORY';
  end if;

  update public.products
  set
    name = btrim(p_name),
    category_id = p_category_id,
    sku = nullif(btrim(coalesce(p_sku, '')), ''),
    description = nullif(btrim(coalesce(p_description, '')), ''),
    purchase_price = coalesce(p_purchase_price, 0),
    selling_price = coalesce(p_selling_price, 0),
    minimum_stock = coalesce(p_minimum_stock, 0),
    unit = coalesce(nullif(btrim(p_unit), ''), 'piece'),
    image_url = coalesce(p_image_url, image_url),
    is_active = coalesce(p_is_active, is_active)
  where id = p_product_id
  returning * into v_product;

  return v_product;
end;
$$;

-- Soft-remove : conserve l'historique, retire l'accès (is_business_member exige active)
create or replace function public.remove_business_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.business_members;
begin
  if not public.has_permission('team.suspend') then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_member from public.business_members where id = p_member_id;
  if not found or v_member.business_id is distinct from public.current_business_id() then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  perform public.write_audit_log(
    'member.removed',
    'member',
    v_member.id,
    jsonb_build_object('user_id', v_member.user_id, 'role', v_member.role)
  );

  update public.business_members
  set status = 'removed'
  where id = p_member_id;
end;
$$;
