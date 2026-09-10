-- Stock initial via adjustment (owner/manager avec stock.adjust) plutôt que purchase,
-- évite les effets de bord du type purchase dans apply_stock_change.

create or replace function public.create_product(
  p_name text,
  p_category_id uuid default null,
  p_sku text default null,
  p_description text default null,
  p_purchase_price numeric default 0,
  p_selling_price numeric default 0,
  p_initial_stock numeric default 0,
  p_minimum_stock numeric default 0,
  p_unit text default 'piece'
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid := public.current_business_id();
  v_product public.products;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  if not public.has_permission('products.create', v_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'PRODUCT_NAME_REQUIRED';
  end if;

  if p_purchase_price < 0 or p_selling_price < 0 or p_initial_stock < 0 or p_minimum_stock < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if p_category_id is not null and not exists (
    select 1 from public.categories
    where id = p_category_id and business_id = v_business_id
  ) then
    raise exception 'INVALID_CATEGORY';
  end if;

  insert into public.products (
    business_id, category_id, name, sku, description,
    purchase_price, selling_price, stock_quantity, minimum_stock, unit
  )
  values (
    v_business_id,
    p_category_id,
    btrim(p_name),
    nullif(btrim(coalesce(p_sku, '')), ''),
    nullif(btrim(coalesce(p_description, '')), ''),
    coalesce(p_purchase_price, 0),
    coalesce(p_selling_price, 0),
    0,
    coalesce(p_minimum_stock, 0),
    coalesce(nullif(btrim(p_unit), ''), 'piece')
  )
  returning * into v_product;

  if p_initial_stock > 0 then
    perform public.apply_stock_change(
      v_product.id,
      p_initial_stock,
      'adjustment',
      'Stock initial'
    );

    select * into v_product from public.products where id = v_product.id;
  end if;

  return v_product;
end;
$$;
