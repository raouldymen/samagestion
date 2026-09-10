-- SamaGestion — clients (socle), ventes, lignes de vente, numérotation, RPC atomiques

-- ---------------------------------------------------------------------------
-- Clients : relation prévue pour les ventes, sans module complet
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_name_not_empty check (length(btrim(name)) > 0)
);

create index customers_business_id_idx on public.customers (business_id);
create index customers_business_name_idx on public.customers (business_id, name);

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Compteur de numéros de vente par commerce
-- ---------------------------------------------------------------------------

create table public.sale_counters (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  last_number integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Ventes
-- ---------------------------------------------------------------------------

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete restrict,
  sale_number text not null,
  subtotal numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  amount_paid numeric(12, 2) not null default 0,
  amount_due numeric(12, 2) not null default 0,
  payment_status text not null,
  payment_method text,
  status text not null default 'completed',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_payment_status_check
    check (payment_status in ('paid', 'partial', 'unpaid')),
  constraint sales_status_check
    check (status in ('completed', 'cancelled')),
  constraint sales_payment_method_check
    check (
      payment_method is null
      or payment_method in ('cash', 'wave', 'orange_money', 'bank', 'card', 'other')
    ),
  constraint sales_amounts_check check (
    subtotal >= 0
    and discount >= 0
    and discount <= subtotal
    and total = subtotal - discount
    and amount_paid >= 0
    and amount_paid <= total
    and amount_due = total - amount_paid
  ),
  constraint sales_payment_status_consistency check (
    (amount_due = 0 and payment_status = 'paid')
    or (amount_paid > 0 and amount_due > 0 and payment_status = 'partial')
    or (amount_paid = 0 and total > 0 and payment_status = 'unpaid')
    or (total = 0 and amount_paid = 0 and payment_status = 'paid')
  )
);

create unique index sales_business_number_unique
  on public.sales (business_id, sale_number);

create index sales_business_id_idx on public.sales (business_id);
create index sales_customer_id_idx on public.sales (customer_id);
create index sales_user_id_idx on public.sales (user_id);
create index sales_created_at_idx on public.sales (business_id, created_at desc);
create index sales_sale_number_idx on public.sales (business_id, sale_number);
create index sales_payment_status_idx on public.sales (business_id, payment_status);
create index sales_status_idx on public.sales (business_id, status);

create trigger sales_set_updated_at
  before update on public.sales
  for each row execute procedure public.set_updated_at();

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  product_name text not null,
  quantity numeric(12, 3) not null,
  unit_price numeric(12, 2) not null,
  purchase_price numeric(12, 2) not null,
  discount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint sale_items_quantity_positive check (quantity > 0),
  constraint sale_items_prices_positive check (
    unit_price >= 0
    and purchase_price >= 0
    and discount >= 0
    and total >= 0
  )
);

create index sale_items_sale_id_idx on public.sale_items (sale_id);
create index sale_items_product_id_idx on public.sale_items (product_id);

-- ---------------------------------------------------------------------------
-- Rôle du membre courant
-- ---------------------------------------------------------------------------

create or replace function public.current_member_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.business_members
  where user_id = auth.uid()
    and business_id = public.current_business_id()
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- Numéro de vente atomique : V-000001
-- ---------------------------------------------------------------------------

create or replace function public.next_sale_number(p_business_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number integer;
begin
  insert into public.sale_counters (business_id, last_number)
  values (p_business_id, 1)
  on conflict (business_id)
  do update set last_number = public.sale_counters.last_number + 1
  returning last_number into v_number;

  return 'V-' || lpad(v_number::text, 6, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- Création atomique d'une vente + lignes + mouvements de stock
-- ---------------------------------------------------------------------------

create or replace function public.create_sale(
  p_items jsonb,
  p_discount numeric default 0,
  p_customer_id uuid default null,
  p_payment_method text default 'cash',
  p_amount_paid numeric default 0,
  p_notes text default null
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid := public.current_business_id();
  v_role text := public.current_member_role();
  v_item record;
  v_product public.products;
  v_line_total numeric;
  v_subtotal numeric := 0;
  v_discount numeric := coalesce(p_discount, 0);
  v_total numeric;
  v_amount_paid numeric := coalesce(p_amount_paid, 0);
  v_amount_due numeric;
  v_payment_status text;
  v_payment_method text;
  v_sale public.sales;
  v_sale_number text;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  if v_role not in ('owner', 'manager', 'cashier', 'seller') then
    raise exception 'FORBIDDEN';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'SALE_ITEMS_REQUIRED';
  end if;

  if v_discount < 0 then
    raise exception 'INVALID_DISCOUNT';
  end if;

  if v_amount_paid < 0 then
    raise exception 'INVALID_PAYMENT';
  end if;

  v_payment_method := nullif(btrim(coalesce(p_payment_method, 'cash')), '');

  if v_payment_method is null or v_payment_method not in ('cash', 'wave', 'orange_money', 'bank', 'card', 'other') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  if p_customer_id is not null and not exists (
    select 1 from public.customers
    where id = p_customer_id and business_id = v_business_id
  ) then
    raise exception 'INVALID_CUSTOMER';
  end if;

  for v_item in
    select x.product_id, sum(x.quantity) as quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity numeric)
    group by x.product_id
    order by x.product_id
  loop
    if v_item.product_id is null or coalesce(v_item.quantity, 0) <= 0 then
      raise exception 'INVALID_QUANTITY';
    end if;

    select * into v_product
    from public.products
    where id = v_item.product_id
    for update;

    if not found or v_product.business_id is distinct from v_business_id then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    if not v_product.is_active then
      raise exception 'PRODUCT_INACTIVE';
    end if;

    if v_product.stock_quantity < v_item.quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_product.stock_quantity;
    end if;

    v_line_total := round(v_item.quantity * v_product.selling_price, 2);
    v_subtotal := v_subtotal + v_line_total;
  end loop;

  if v_subtotal <= 0 then
    raise exception 'SALE_TOTAL_REQUIRED';
  end if;

  if v_discount > v_subtotal then
    raise exception 'INVALID_DISCOUNT';
  end if;

  v_total := v_subtotal - v_discount;

  if v_amount_paid > v_total then
    raise exception 'PAYMENT_EXCEEDS_TOTAL';
  end if;

  v_amount_due := v_total - v_amount_paid;

  if v_amount_due = 0 then
    v_payment_status := 'paid';
  elsif v_amount_paid > 0 then
    v_payment_status := 'partial';
  else
    v_payment_status := 'unpaid';
  end if;

  v_sale_number := public.next_sale_number(v_business_id);

  insert into public.sales (
    business_id,
    customer_id,
    user_id,
    sale_number,
    subtotal,
    discount,
    total,
    amount_paid,
    amount_due,
    payment_status,
    payment_method,
    status,
    notes
  )
  values (
    v_business_id,
    p_customer_id,
    v_user_id,
    v_sale_number,
    v_subtotal,
    v_discount,
    v_total,
    v_amount_paid,
    v_amount_due,
    v_payment_status,
    v_payment_method,
    'completed',
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning * into v_sale;

  for v_item in
    select x.product_id, sum(x.quantity) as quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity numeric)
    group by x.product_id
    order by x.product_id
  loop
    select * into v_product
    from public.products
    where id = v_item.product_id;

    v_line_total := round(v_item.quantity * v_product.selling_price, 2);

    insert into public.sale_items (
      sale_id,
      product_id,
      product_name,
      quantity,
      unit_price,
      purchase_price,
      discount,
      total
    )
    values (
      v_sale.id,
      v_product.id,
      v_product.name,
      v_item.quantity,
      v_product.selling_price,
      v_product.purchase_price,
      0,
      v_line_total
    );

    perform public.apply_stock_change(
      v_product.id,
      -v_item.quantity,
      'sale',
      'Vente ' || v_sale.sale_number,
      v_sale.id
    );
  end loop;

  return v_sale;
end;
$$;

-- ---------------------------------------------------------------------------
-- Annulation : restaure le stock, conserve la vente
-- ---------------------------------------------------------------------------

create or replace function public.cancel_sale(p_sale_id uuid)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_role text := public.current_member_role();
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

  if v_role not in ('owner', 'manager')
     and not (v_role = 'cashier' and v_sale.user_id = v_user_id) then
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
  where id = v_sale.id
  returning * into v_sale;

  return v_sale;
end;
$$;

create or replace function public.create_customer(p_name text, p_phone text default null)
returns public.customers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_customer public.customers;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  if public.current_member_role() not in ('owner', 'manager', 'cashier', 'seller') then
    raise exception 'FORBIDDEN';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'CUSTOMER_NAME_REQUIRED';
  end if;

  insert into public.customers (business_id, name, phone)
  values (
    v_business_id,
    btrim(p_name),
    nullif(btrim(coalesce(p_phone, '')), '')
  )
  returning * into v_customer;

  return v_customer;
end;
$$;

create or replace function public.get_today_sales_stats()
returns table (
  revenue numeric,
  sales_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(total), 0) as revenue,
    count(*)::bigint as sales_count
  from public.sales
  where business_id = public.current_business_id()
    and status = 'completed'
    and created_at >= date_trunc('day', timezone('Africa/Dakar', now()))
      at time zone 'Africa/Dakar'
    and (
      public.current_member_role() in ('owner', 'manager')
      or user_id = auth.uid()
    );
$$;

revoke all on function public.current_member_role() from public;
revoke all on function public.next_sale_number(uuid) from public;
revoke all on function public.create_sale(jsonb, numeric, uuid, text, numeric, text) from public;
revoke all on function public.cancel_sale(uuid) from public;
revoke all on function public.create_customer(text, text) from public;
revoke all on function public.get_today_sales_stats() from public;

grant execute on function public.current_member_role() to authenticated;
grant execute on function public.create_sale(jsonb, numeric, uuid, text, numeric, text) to authenticated;
grant execute on function public.cancel_sale(uuid) to authenticated;
grant execute on function public.create_customer(text, text) to authenticated;
grant execute on function public.get_today_sales_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.sale_counters enable row level security;

alter table public.customers force row level security;
alter table public.sales force row level security;
alter table public.sale_items force row level security;
alter table public.sale_counters force row level security;

create policy "customers_member_select"
  on public.customers
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "sales_member_select"
  on public.sales
  for select
  to authenticated
  using (
    public.is_business_member(business_id)
    and (
      public.current_member_role() in ('owner', 'manager')
      or user_id = auth.uid()
    )
  );

create policy "sale_items_member_select"
  on public.sale_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.sales as sale
      where sale.id = sale_items.sale_id
        and public.is_business_member(sale.business_id)
        and (
          public.current_member_role() in ('owner', 'manager')
          or sale.user_id = auth.uid()
        )
    )
  );

grant select on table public.customers to authenticated;
grant select on table public.sales to authenticated;
grant select on table public.sale_items to authenticated;
