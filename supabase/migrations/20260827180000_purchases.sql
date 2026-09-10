-- SamaGestion — fournisseurs, achats, réapprovisionnement atomique
-- Un achat de stock n'est PAS une dépense opérationnelle.

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suppliers_name_not_empty check (length(btrim(name)) > 0)
);

create unique index suppliers_business_name_unique
  on public.suppliers (business_id, lower(btrim(name)));

create index suppliers_business_id_idx on public.suppliers (business_id);
create index suppliers_name_idx on public.suppliers (business_id, name);

create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute procedure public.set_updated_at();

create table public.purchase_counters (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  last_number integer not null default 0
);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  supplier_id uuid references public.suppliers (id) on delete set null,
  purchase_number text not null,
  subtotal numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  amount_paid numeric(12, 2) not null default 0,
  amount_due numeric(12, 2) not null default 0,
  payment_status text not null,
  payment_method text,
  status text not null default 'completed',
  notes text,
  purchase_date date not null default (timezone('Africa/Dakar', now()))::date,
  created_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint purchases_payment_status_check
    check (payment_status in ('paid', 'partial', 'unpaid')),
  constraint purchases_status_check
    check (status in ('completed', 'cancelled')),
  constraint purchases_payment_method_check
    check (
      payment_method is null
      or payment_method in ('cash', 'wave', 'orange_money', 'bank', 'card', 'other')
    ),
  constraint purchases_amounts_check check (
    subtotal >= 0
    and discount >= 0
    and discount <= subtotal
    and total = subtotal - discount
    and amount_paid >= 0
    and amount_paid <= total
    and amount_due = total - amount_paid
  ),
  constraint purchases_payment_status_consistency check (
    (amount_due = 0 and payment_status = 'paid')
    or (amount_paid > 0 and amount_due > 0 and payment_status = 'partial')
    or (amount_paid = 0 and total > 0 and payment_status = 'unpaid')
    or (total = 0 and amount_paid = 0 and payment_status = 'paid')
  )
);

create unique index purchases_business_number_unique
  on public.purchases (business_id, purchase_number);

create index purchases_business_id_idx on public.purchases (business_id);
create index purchases_supplier_id_idx on public.purchases (supplier_id);
create index purchases_purchase_date_idx on public.purchases (business_id, purchase_date desc);
create index purchases_purchase_number_idx on public.purchases (business_id, purchase_number);
create index purchases_payment_status_idx on public.purchases (business_id, payment_status);
create index purchases_status_idx on public.purchases (business_id, status);
create index purchases_created_at_idx on public.purchases (business_id, created_at desc);

create trigger purchases_set_updated_at
  before update on public.purchases
  for each row execute procedure public.set_updated_at();

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references public.purchases (id) on delete restrict,
  product_id uuid not null references public.products (id) on delete restrict,
  product_name text not null,
  quantity numeric(12, 3) not null,
  unit_cost numeric(12, 2) not null,
  total numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint purchase_items_quantity_positive check (quantity > 0),
  constraint purchase_items_cost_check check (unit_cost >= 0 and total >= 0)
);

create index purchase_items_purchase_id_idx on public.purchase_items (purchase_id);
create index purchase_items_product_id_idx on public.purchase_items (product_id);

-- ---------------------------------------------------------------------------
-- Numéro d'achat A-000001
-- ---------------------------------------------------------------------------

create or replace function public.next_purchase_number(p_business_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number integer;
begin
  insert into public.purchase_counters (business_id, last_number)
  values (p_business_id, 1)
  on conflict (business_id)
  do update set last_number = public.purchase_counters.last_number + 1
  returning last_number into v_number;

  return 'A-' || lpad(v_number::text, 6, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- Fournisseurs
-- ---------------------------------------------------------------------------

create or replace function public.create_supplier(
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_address text default null,
  p_notes text default null
)
returns public.suppliers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_supplier public.suppliers;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  if public.current_member_role() not in ('owner', 'manager') then
    raise exception 'FORBIDDEN';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'SUPPLIER_NAME_REQUIRED';
  end if;

  insert into public.suppliers (business_id, name, phone, email, address, notes)
  values (
    v_business_id,
    btrim(p_name),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(btrim(coalesce(p_email, '')), ''),
    nullif(btrim(coalesce(p_address, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning * into v_supplier;

  return v_supplier;
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

  if public.current_member_role() not in ('owner', 'manager') then
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

-- ---------------------------------------------------------------------------
-- Création atomique : purchase + items + stock + coût d'achat
-- ---------------------------------------------------------------------------

create or replace function public.create_purchase(
  p_items jsonb,
  p_discount numeric default 0,
  p_supplier_id uuid default null,
  p_payment_method text default 'cash',
  p_amount_paid numeric default 0,
  p_notes text default null,
  p_purchase_date date default null
)
returns public.purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid := public.current_business_id();
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
  v_purchase public.purchases;
  v_purchase_number text;
  v_purchase_date date := coalesce(p_purchase_date, (timezone('Africa/Dakar', now()))::date);
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  if public.current_member_role() not in ('owner', 'manager') then
    raise exception 'FORBIDDEN';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'PURCHASE_ITEMS_REQUIRED';
  end if;

  if v_discount < 0 then
    raise exception 'INVALID_DISCOUNT';
  end if;

  if v_amount_paid < 0 then
    raise exception 'INVALID_PAYMENT';
  end if;

  v_payment_method := nullif(btrim(coalesce(p_payment_method, '')), '');

  if v_payment_method is not null
     and v_payment_method not in ('cash', 'wave', 'orange_money', 'bank', 'card', 'other') then
    raise exception 'INVALID_PAYMENT_METHOD';
  end if;

  if v_payment_method is null then
    v_payment_method := 'cash';
  end if;

  if p_supplier_id is not null and not exists (
    select 1 from public.suppliers
    where id = p_supplier_id
      and business_id = v_business_id
      and is_active = true
  ) then
    raise exception 'INVALID_SUPPLIER';
  end if;

  for v_item in
    select
      x.product_id,
      sum(x.quantity) as quantity,
      case
        when sum(x.quantity) = 0 then 0
        else round(sum(x.quantity * x.unit_cost) / sum(x.quantity), 2)
      end as unit_cost
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity numeric, unit_cost numeric)
    group by x.product_id
    order by x.product_id
  loop
    if v_item.product_id is null or coalesce(v_item.quantity, 0) <= 0 then
      raise exception 'INVALID_QUANTITY';
    end if;

    if coalesce(v_item.unit_cost, 0) < 0 then
      raise exception 'INVALID_AMOUNT';
    end if;

    select * into v_product
    from public.products
    where id = v_item.product_id
    for update;

    if not found or v_product.business_id is distinct from v_business_id then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    v_line_total := round(v_item.quantity * v_item.unit_cost, 2);
    v_subtotal := v_subtotal + v_line_total;
  end loop;

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

  v_purchase_number := public.next_purchase_number(v_business_id);

  insert into public.purchases (
    business_id,
    supplier_id,
    purchase_number,
    subtotal,
    discount,
    total,
    amount_paid,
    amount_due,
    payment_status,
    payment_method,
    status,
    notes,
    purchase_date,
    created_by
  )
  values (
    v_business_id,
    p_supplier_id,
    v_purchase_number,
    v_subtotal,
    v_discount,
    v_total,
    v_amount_paid,
    v_amount_due,
    v_payment_status,
    v_payment_method,
    'completed',
    nullif(btrim(coalesce(p_notes, '')), ''),
    v_purchase_date,
    v_user_id
  )
  returning * into v_purchase;

  for v_item in
    select
      x.product_id,
      sum(x.quantity) as quantity,
      case
        when sum(x.quantity) = 0 then 0
        else round(sum(x.quantity * x.unit_cost) / sum(x.quantity), 2)
      end as unit_cost
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity numeric, unit_cost numeric)
    group by x.product_id
    order by x.product_id
  loop
    select * into v_product
    from public.products
    where id = v_item.product_id;

    v_line_total := round(v_item.quantity * v_item.unit_cost, 2);

    insert into public.purchase_items (
      purchase_id,
      product_id,
      product_name,
      quantity,
      unit_cost,
      total
    )
    values (
      v_purchase.id,
      v_product.id,
      v_product.name,
      v_item.quantity,
      v_item.unit_cost,
      v_line_total
    );

    perform public.apply_stock_change(
      v_product.id,
      v_item.quantity,
      'purchase',
      'Achat ' || v_purchase.purchase_number,
      v_purchase.id
    );

    update public.products
    set purchase_price = v_item.unit_cost
    where id = v_product.id;
  end loop;

  return v_purchase;
end;
$$;

-- ---------------------------------------------------------------------------
-- Annulation : retire le stock si possible, conserve l'achat
-- ---------------------------------------------------------------------------

create or replace function public.cancel_purchase(p_purchase_id uuid)
returns public.purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_purchase public.purchases;
  v_item public.purchase_items;
  v_product public.products;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if public.current_member_role() not in ('owner', 'manager') then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_purchase
  from public.purchases
  where id = p_purchase_id
  for update;

  if not found then
    raise exception 'PURCHASE_NOT_FOUND';
  end if;

  if not public.is_business_member(v_purchase.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  if v_purchase.status = 'cancelled' then
    raise exception 'PURCHASE_ALREADY_CANCELLED';
  end if;

  for v_item in
    select * from public.purchase_items
    where purchase_id = v_purchase.id
    order by product_id
  loop
    select * into v_product
    from public.products
    where id = v_item.product_id
    for update;

    if not found then
      raise exception 'PRODUCT_NOT_FOUND';
    end if;

    if v_product.stock_quantity < v_item.quantity then
      raise exception 'INSUFFICIENT_STOCK:%', v_product.stock_quantity;
    end if;
  end loop;

  for v_item in
    select * from public.purchase_items
    where purchase_id = v_purchase.id
    order by product_id
  loop
    perform public.apply_stock_change(
      v_item.product_id,
      -v_item.quantity,
      'return',
      'Annulation ' || v_purchase.purchase_number,
      v_purchase.id
    );
  end loop;

  update public.purchases
  set status = 'cancelled'
  where id = v_purchase.id
  returning * into v_purchase;

  return v_purchase;
end;
$$;

create or replace function public.get_purchase_stats()
returns table (
  today numeric,
  month numeric,
  total numeric,
  suppliers_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select
      (timezone('Africa/Dakar', now()))::date as today,
      date_trunc('month', timezone('Africa/Dakar', now()))::date as month_start,
      public.current_business_id() as business_id
  )
  select
    coalesce((
      select sum(p.total)
      from public.purchases as p, bounds as b
      where p.business_id = b.business_id
        and p.status = 'completed'
        and p.purchase_date = b.today
    ), 0) as today,
    coalesce((
      select sum(p.total)
      from public.purchases as p, bounds as b
      where p.business_id = b.business_id
        and p.status = 'completed'
        and p.purchase_date >= b.month_start
    ), 0) as month,
    coalesce((
      select sum(p.total)
      from public.purchases as p, bounds as b
      where p.business_id = b.business_id
        and p.status = 'completed'
    ), 0) as total,
    coalesce((
      select count(*)::bigint
      from public.suppliers as s, bounds as b
      where s.business_id = b.business_id
        and s.is_active = true
    ), 0) as suppliers_count;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard : achats de la période + dettes fournisseurs (pas des dépenses)
-- ---------------------------------------------------------------------------

create or replace function public.get_dashboard_bundle(
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz,
  p_prev_to timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_current jsonb;
  v_previous jsonb;
  v_top jsonb;
  v_days jsonb;
  v_activity jsonb;
  v_receivables_open numeric := 0;
  v_purchases_total numeric := 0;
  v_payables_open numeric := 0;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  v_current := public.financial_summary_for(v_business_id, p_from, p_to);
  v_previous := public.financial_summary_for(v_business_id, p_prev_from, p_prev_to);

  select coalesce(jsonb_agg(row_to_json(ranked) order by ranked.quantity desc), '[]'::jsonb)
  into v_top
  from (
    select
      si.product_name as name,
      sum(si.quantity) as quantity
    from public.sale_items as si
    inner join public.sales as s on s.id = si.sale_id
    where s.business_id = v_business_id
      and s.status = 'completed'
      and s.created_at >= p_from
      and s.created_at < p_to
    group by si.product_name
    order by sum(si.quantity) desc
    limit 5
  ) as ranked;

  select coalesce(jsonb_agg(row_to_json(day_row) order by day_row.day), '[]'::jsonb)
  into v_days
  from (
    select
      d.day::date as day,
      coalesce(sum(s.total), 0) as revenue
    from generate_series(
      ((timezone('Africa/Dakar', now()))::date - 6)::timestamp,
      (timezone('Africa/Dakar', now()))::date::timestamp,
      interval '1 day'
    ) as d(day)
    left join public.sales as s
      on s.business_id = v_business_id
      and s.status = 'completed'
      and (s.created_at at time zone 'Africa/Dakar')::date = d.day::date
    group by d.day
  ) as day_row;

  select coalesce(sum(s.amount_due), 0)
  into v_receivables_open
  from public.sales as s
  where s.business_id = v_business_id
    and s.status = 'completed'
    and s.customer_id is not null
    and s.amount_due > 0;

  select coalesce(sum(p.total), 0)
  into v_purchases_total
  from public.purchases as p
  where p.business_id = v_business_id
    and p.status = 'completed'
    and p.purchase_date >= (p_from at time zone 'Africa/Dakar')::date
    and p.purchase_date < (p_to at time zone 'Africa/Dakar')::date;

  select coalesce(sum(p.amount_due), 0)
  into v_payables_open
  from public.purchases as p
  where p.business_id = v_business_id
    and p.status = 'completed'
    and p.amount_due > 0;

  select coalesce(jsonb_agg(row_to_json(act) order by act.occurred_at desc), '[]'::jsonb)
  into v_activity
  from (
    (
      select
        s.id::text as id,
        'sale'::text as type,
        ('Vente ' || s.sale_number) as title,
        s.total as amount,
        s.created_at as occurred_at
      from public.sales as s
      where s.business_id = v_business_id
      order by s.created_at desc
      limit 8
    )
    union all
    (
      select
        e.id::text,
        'expense'::text,
        ('Dépense ' || e.description),
        -e.amount,
        e.created_at
      from public.expenses as e
      where e.business_id = v_business_id
        and e.status = 'active'
      order by e.created_at desc
      limit 8
    )
    union all
    (
      select
        p.id::text,
        'purchase'::text,
        ('Achat ' || p.purchase_number),
        -p.total,
        p.created_at
      from public.purchases as p
      where p.business_id = v_business_id
        and p.status = 'completed'
      order by p.created_at desc
      limit 8
    )
    union all
    (
      select
        m.id::text,
        'stock'::text,
        coalesce('Ajustement stock · ' || pr.name, 'Ajustement stock'),
        0::numeric,
        m.created_at
      from public.stock_movements as m
      left join public.products as pr on pr.id = m.product_id
      where m.business_id = v_business_id
        and m.type in ('adjustment', 'loss')
      order by m.created_at desc
      limit 8
    )
    order by occurred_at desc
    limit 8
  ) as act;

  return jsonb_build_object(
    'current', v_current,
    'previous', v_previous,
    'receivables_open', v_receivables_open,
    'purchases_total', v_purchases_total,
    'payables_open', v_payables_open,
    'top_products', v_top,
    'revenue_days', v_days,
    'activity', v_activity
  );
end;
$$;

revoke all on function public.next_purchase_number(uuid) from public;
revoke all on function public.create_supplier(text, text, text, text, text) from public;
revoke all on function public.update_supplier(uuid, text, text, text, text, text, boolean) from public;
revoke all on function public.create_purchase(jsonb, numeric, uuid, text, numeric, text, date) from public;
revoke all on function public.cancel_purchase(uuid) from public;
revoke all on function public.get_purchase_stats() from public;

grant execute on function public.create_supplier(text, text, text, text, text) to authenticated;
grant execute on function public.update_supplier(uuid, text, text, text, text, text, boolean) to authenticated;
grant execute on function public.create_purchase(jsonb, numeric, uuid, text, numeric, text, date) to authenticated;
grant execute on function public.cancel_purchase(uuid) to authenticated;
grant execute on function public.get_purchase_stats() to authenticated;

alter table public.suppliers enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;
alter table public.purchase_counters enable row level security;
alter table public.suppliers force row level security;
alter table public.purchases force row level security;
alter table public.purchase_items force row level security;
alter table public.purchase_counters force row level security;

create policy "suppliers_member_select"
  on public.suppliers
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "purchases_member_select"
  on public.purchases
  for select
  to authenticated
  using (public.is_business_member(business_id));

create policy "purchase_items_member_select"
  on public.purchase_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.purchases as p
      where p.id = purchase_id
        and public.is_business_member(p.business_id)
    )
  );

grant select on table public.suppliers to authenticated;
grant select on table public.purchases to authenticated;
grant select on table public.purchase_items to authenticated;
