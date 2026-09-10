-- SamaGestion — catégories, produits, mouvements de stock, storage

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_name_not_empty check (length(btrim(name)) > 0)
);

create unique index categories_business_name_unique
  on public.categories (business_id, lower(btrim(name)));

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  name text not null,
  sku text,
  description text,
  purchase_price numeric(12, 2) not null default 0,
  selling_price numeric(12, 2) not null default 0,
  stock_quantity numeric(12, 3) not null default 0,
  minimum_stock numeric(12, 3) not null default 0,
  unit text not null default 'piece',
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  stock_status text generated always as (
    case
      when stock_quantity <= 0 then 'out'
      when stock_quantity <= minimum_stock then 'low'
      else 'in_stock'
    end
  ) stored,
  constraint products_name_not_empty check (length(btrim(name)) > 0),
  constraint products_purchase_price_positive check (purchase_price >= 0),
  constraint products_selling_price_positive check (selling_price >= 0),
  constraint products_stock_quantity_positive check (stock_quantity >= 0),
  constraint products_minimum_stock_positive check (minimum_stock >= 0),
  constraint products_unit_check check (
    unit in ('piece', 'kg', 'g', 'litre', 'mètre', 'carton', 'paquet', 'autre')
  )
);

create unique index products_business_sku_unique
  on public.products (business_id, lower(btrim(sku)))
  where sku is not null and btrim(sku) <> '';

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  type text not null,
  quantity numeric(12, 3) not null,
  previous_stock numeric(12, 3) not null,
  new_stock numeric(12, 3) not null,
  reason text,
  reference_id uuid,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint stock_movements_type_check
    check (type in ('purchase', 'sale', 'return', 'adjustment', 'loss')),
  constraint stock_movements_quantity_not_zero check (quantity <> 0)
);

create index categories_business_id_idx on public.categories (business_id);
create index products_business_id_idx on public.products (business_id);
create index products_category_id_idx on public.products (category_id);
create index products_business_sku_idx on public.products (business_id, sku);
create index products_business_name_idx on public.products (business_id, name);
create index products_business_status_idx on public.products (business_id, is_active);
create index products_business_stock_status_idx on public.products (business_id, stock_status);
create index products_created_at_idx on public.products (business_id, created_at desc);
create index stock_movements_business_id_idx on public.stock_movements (business_id);
create index stock_movements_product_id_idx on public.stock_movements (product_id);
create index stock_movements_created_at_idx on public.stock_movements (product_id, created_at desc);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute procedure public.set_updated_at();

create trigger products_set_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id
  from public.business_members
  where user_id = auth.uid()
  order by created_at asc
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- Stock atomique : ne jamais modifier stock_quantity hors de cette fonction
-- ---------------------------------------------------------------------------

create or replace function public.apply_stock_change(
  p_product_id uuid,
  p_quantity numeric,
  p_type text,
  p_reason text default null,
  p_reference_id uuid default null
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_product public.products;
  v_new_stock numeric;
  v_movement public.stock_movements;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_quantity = 0 then
    raise exception 'INVALID_QUANTITY';
  end if;

  if p_type not in ('purchase', 'sale', 'return', 'adjustment', 'loss') then
    raise exception 'INVALID_STOCK_TYPE';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'PRODUCT_NOT_FOUND';
  end if;

  if not public.is_business_member(v_product.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  v_new_stock := v_product.stock_quantity + p_quantity;

  if v_new_stock < 0 then
    raise exception 'INSUFFICIENT_STOCK';
  end if;

  perform set_config('samagestion.allow_stock_change', 'on', true);

  update public.products
  set stock_quantity = v_new_stock
  where id = p_product_id;

  insert into public.stock_movements (
    business_id,
    product_id,
    type,
    quantity,
    previous_stock,
    new_stock,
    reason,
    reference_id,
    created_by
  )
  values (
    v_product.business_id,
    p_product_id,
    p_type,
    p_quantity,
    v_product.stock_quantity,
    v_new_stock,
    nullif(btrim(coalesce(p_reason, '')), ''),
    p_reference_id,
    v_user_id
  )
  returning * into v_movement;

  return v_movement;
end;
$$;

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
    business_id,
    category_id,
    name,
    sku,
    description,
    purchase_price,
    selling_price,
    stock_quantity,
    minimum_stock,
    unit
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
      'purchase',
      'Stock initial'
    );

    select * into v_product from public.products where id = v_product.id;
  end if;

  return v_product;
end;
$$;

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

  if not public.is_business_member(v_product.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  v_business_id := v_product.business_id;

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

  update public.products
  set is_active = false
  where id = p_product_id
  returning * into v_product;

  return v_product;
end;
$$;

create or replace function public.create_category(p_name text)
returns public.categories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_category public.categories;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'CATEGORY_NAME_REQUIRED';
  end if;

  insert into public.categories (business_id, name)
  values (v_business_id, btrim(p_name))
  returning * into v_category;

  return v_category;
end;
$$;

create or replace function public.update_category(p_category_id uuid, p_name text)
returns public.categories
language plpgsql
security definer
set search_path = public
as $$
declare
  v_category public.categories;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_category from public.categories where id = p_category_id;

  if not found then
    raise exception 'CATEGORY_NOT_FOUND';
  end if;

  if not public.is_business_member(v_category.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'CATEGORY_NAME_REQUIRED';
  end if;

  update public.categories
  set name = btrim(p_name)
  where id = p_category_id
  returning * into v_category;

  return v_category;
end;
$$;

create or replace function public.enforce_stock_via_rpc()
returns trigger
language plpgsql
as $$
begin
  if current_setting('samagestion.allow_stock_change', true) = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' and coalesce(new.stock_quantity, 0) <> 0 then
    raise exception 'STOCK_MUST_USE_RPC';
  end if;

  if tg_op = 'UPDATE' and new.stock_quantity is distinct from old.stock_quantity then
    raise exception 'STOCK_MUST_USE_RPC';
  end if;

  return new;
end;
$$;

create trigger products_enforce_stock_via_rpc
  before insert or update on public.products
  for each row execute procedure public.enforce_stock_via_rpc();

create or replace function public.list_categories_with_counts()
returns table (
  id uuid,
  business_id uuid,
  name text,
  product_count bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.business_id,
    c.name,
    count(p.id)::bigint as product_count,
    c.created_at,
    c.updated_at
  from public.categories as c
  left join public.products as p on p.category_id = c.id
  where c.business_id = public.current_business_id()
  group by c.id
  order by c.name;
$$;

create or replace function public.get_product_stats()
returns table (
  total bigint,
  active bigint,
  low_stock bigint,
  stock_value numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint as total,
    count(*) filter (where is_active)::bigint as active,
    count(*) filter (
      where is_active and (stock_status = 'low' or stock_status = 'out')
    )::bigint as low_stock,
    coalesce(sum(stock_quantity * purchase_price) filter (where is_active), 0) as stock_value
  from public.products
  where business_id = public.current_business_id();
$$;

revoke all on function public.current_business_id() from public;
revoke all on function public.apply_stock_change(uuid, numeric, text, text, uuid) from public;
revoke all on function public.create_product(text, uuid, text, text, numeric, numeric, numeric, numeric, text) from public;
revoke all on function public.update_product(uuid, text, uuid, text, text, numeric, numeric, numeric, text, text, boolean) from public;
revoke all on function public.set_product_image(uuid, text) from public;
revoke all on function public.deactivate_product(uuid) from public;
revoke all on function public.create_category(text) from public;
revoke all on function public.update_category(uuid, text) from public;
revoke all on function public.list_categories_with_counts() from public;
revoke all on function public.get_product_stats() from public;

grant execute on function public.current_business_id() to authenticated;
grant execute on function public.apply_stock_change(uuid, numeric, text, text, uuid) to authenticated;
grant execute on function public.create_product(text, uuid, text, text, numeric, numeric, numeric, numeric, text) to authenticated;
grant execute on function public.update_product(uuid, text, uuid, text, text, numeric, numeric, numeric, text, text, boolean) to authenticated;
grant execute on function public.set_product_image(uuid, text) to authenticated;
grant execute on function public.deactivate_product(uuid) to authenticated;
grant execute on function public.create_category(text) to authenticated;
grant execute on function public.update_category(uuid, text) to authenticated;
grant execute on function public.list_categories_with_counts() to authenticated;
grant execute on function public.get_product_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.stock_movements enable row level security;

alter table public.categories force row level security;
alter table public.products force row level security;
alter table public.stock_movements force row level security;

create policy "categories_member_all"
  on public.categories
  for all
  to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "products_member_select"
  on public.products
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "products_member_update"
  on public.products
  for update
  to authenticated
  using (public.is_business_member(business_id))
  with check (public.is_business_member(business_id));

create policy "stock_movements_member_select"
  on public.stock_movements
  for select
  to authenticated
  using (public.is_business_member(business_id));

-- Permet d'afficher le nom de l'auteur d'un mouvement dans le même commerce
create policy "profiles_select_comembers"
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.business_members as member
      where member.user_id = profiles.id
        and public.is_business_member(member.business_id)
    )
  );

grant select, update on table public.categories to authenticated;
grant select, update on table public.products to authenticated;
grant select on table public.stock_movements to authenticated;

revoke update on table public.products from authenticated;
grant update (
  category_id,
  name,
  sku,
  description,
  purchase_price,
  selling_price,
  minimum_stock,
  unit,
  image_url,
  is_active
) on table public.products to authenticated;

-- ---------------------------------------------------------------------------
-- Storage : images produits
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  false,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "product_images_select_member"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
  );

create policy "product_images_insert_member"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'product-images'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
  );

create policy "product_images_update_member"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'product-images'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
  );

create policy "product_images_delete_member"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
  );
