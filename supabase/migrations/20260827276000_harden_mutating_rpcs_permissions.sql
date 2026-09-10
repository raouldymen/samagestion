-- Durcit les RPC security definer encore trop permissives :
-- membership seule ≠ permission métier liée au business_id de la ligne.

create or replace function public.set_product_image(
  p_product_id uuid,
  p_image_url text
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_product from public.products where id = p_product_id;

  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  if not public.is_business_member(v_product.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not public.has_permission('products.edit', v_product.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  update public.products
  set image_url = nullif(btrim(coalesce(p_image_url, '')), '')
  where id = p_product_id
  returning * into v_product;

  return v_product;
end;
$$;

create or replace function public.deactivate_product(p_product_id uuid)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_product from public.products where id = p_product_id;

  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  if not public.is_business_member(v_product.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not public.has_permission('products.delete', v_product.business_id)
     and not public.has_permission('products.edit', v_product.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  update public.products
  set is_active = false
  where id = p_product_id
  returning * into v_product;

  return v_product;
end;
$$;

create or replace function public.update_expense(
  p_expense_id uuid,
  p_description text,
  p_category_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_expense_date date,
  p_notes text default null
)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expense public.expenses;
  v_business_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_expense from public.expenses where id = p_expense_id;

  if not found then
    raise exception 'EXPENSE_NOT_FOUND';
  end if;

  v_business_id := v_expense.business_id;

  if not public.is_business_member(v_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not public.has_permission('expenses.edit', v_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_expense.status = 'cancelled' then
    raise exception 'EXPENSE_CANCELLED';
  end if;

  if p_description is null or btrim(p_description) = '' then
    raise exception 'DESCRIPTION_REQUIRED';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if p_expense_date is null then
    raise exception 'DATE_REQUIRED';
  end if;

  if p_payment_method is null or p_payment_method not in ('cash', 'wave', 'orange_money', 'bank', 'card', 'other') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  if p_category_id is null or not exists (
    select 1 from public.expense_categories
    where id = p_category_id and business_id = v_business_id
  ) then
    raise exception 'INVALID_CATEGORY';
  end if;

  update public.expenses
  set
    description = btrim(p_description),
    category_id = p_category_id,
    amount = p_amount,
    payment_method = p_payment_method,
    expense_date = p_expense_date,
    notes = nullif(btrim(coalesce(p_notes, '')), '')
  where id = p_expense_id
  returning * into v_expense;

  return v_expense;
end;
$$;

create or replace function public.update_supplier(
  p_supplier_id uuid,
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_address text default null,
  p_notes text default null,
  p_is_active boolean default true
)
returns public.suppliers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supplier public.suppliers;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_supplier from public.suppliers where id = p_supplier_id;

  if not found then
    raise exception 'SUPPLIER_NOT_FOUND';
  end if;

  if not public.is_business_member(v_supplier.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not public.has_permission('suppliers.edit', v_supplier.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'SUPPLIER_NAME_REQUIRED';
  end if;

  update public.suppliers
  set
    name = btrim(p_name),
    phone = nullif(btrim(coalesce(p_phone, '')), ''),
    email = nullif(btrim(coalesce(p_email, '')), ''),
    address = nullif(btrim(coalesce(p_address, '')), ''),
    notes = nullif(btrim(coalesce(p_notes, '')), ''),
    is_active = coalesce(p_is_active, true)
  where id = p_supplier_id
  returning * into v_supplier;

  return v_supplier;
end;
$$;

create or replace function public.cancel_sale(p_sale_id uuid)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_sale public.sales;
  v_item public.sale_items;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_sale
  from public.sales
  where id = p_sale_id
  for update;

  if not found then
    raise exception 'SALE_NOT_FOUND';
  end if;

  if not public.is_business_member(v_sale.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not (
    public.has_permission('sales.cancel', v_sale.business_id)
    or (
      public.has_permission('sales.cancel_own', v_sale.business_id)
      and v_sale.user_id = v_user_id
    )
  ) then
    raise exception 'FORBIDDEN';
  end if;

  if v_sale.status = 'cancelled' then
    raise exception 'SALE_ALREADY_CANCELLED';
  end if;

  for v_item in
    select * from public.sale_items
    where sale_id = v_sale.id
    order by product_id
  loop
    perform public.apply_stock_change(
      v_item.product_id,
      v_item.quantity,
      'return',
      'Annulation ' || v_sale.sale_number,
      v_sale.id
    );
  end loop;

  update public.sales
  set status = 'cancelled'
  where id = p_sale_id
  returning * into v_sale;

  return v_sale;
end;
$$;
