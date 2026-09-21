-- Circuit de caisse : un vendeur prépare la vente, la caisse l'encaisse.

create table public.cashier_sale_queue (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  items jsonb not null,
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  notes text,
  status text not null default 'queued' check (status in ('queued', 'completed', 'cancelled')),
  processed_by uuid references auth.users(id) on delete set null,
  completed_sale_id uuid references public.sales(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cashier_sale_queue_business_status_idx
  on public.cashier_sale_queue (business_id, status, created_at asc);

create trigger cashier_sale_queue_set_updated_at
  before update on public.cashier_sale_queue
  for each row execute procedure public.set_updated_at();

alter table public.cashier_sale_queue enable row level security;
alter table public.cashier_sale_queue force row level security;

create policy "cashier_sale_queue_select"
  on public.cashier_sale_queue for select to authenticated
  using (
    public.is_business_member(business_id)
    and (
      seller_id = auth.uid()
      or public.current_member_role() in ('owner', 'manager', 'cashier')
    )
  );

create or replace function public.cashier_checkout_is_required()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members
    where business_id = public.current_business_id()
      and role = 'cashier'
      and status = 'active'
  );
$$;

create or replace function public.queue_sale_for_cashier(
  p_items jsonb,
  p_discount numeric default 0,
  p_customer_id uuid default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_item record;
  v_product public.products;
  v_queue public.cashier_sale_queue;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_business_id is null then raise exception 'NO_BUSINESS'; end if;
  if public.current_member_role() not in ('owner', 'manager', 'seller') then raise exception 'FORBIDDEN'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'SALE_ITEMS_REQUIRED';
  end if;
  if coalesce(p_discount, 0) < 0 then raise exception 'INVALID_DISCOUNT'; end if;

  if p_customer_id is not null and not exists (
    select 1 from public.customers where id = p_customer_id and business_id = v_business_id
  ) then
    raise exception 'INVALID_CUSTOMER';
  end if;

  for v_item in
    select x.product_id, sum(x.quantity) as quantity
    from jsonb_to_recordset(p_items) as x(product_id uuid, quantity numeric)
    group by x.product_id
  loop
    if v_item.product_id is null or coalesce(v_item.quantity, 0) <= 0 then
      raise exception 'INVALID_QUANTITY';
    end if;
    select * into v_product from public.products where id = v_item.product_id for share;
    if not found or v_product.business_id is distinct from v_business_id then raise exception 'PRODUCT_NOT_FOUND'; end if;
    if not v_product.is_active then raise exception 'PRODUCT_INACTIVE'; end if;
  end loop;

  insert into public.cashier_sale_queue (business_id, seller_id, customer_id, items, discount, notes)
  values (v_business_id, auth.uid(), p_customer_id, p_items, coalesce(p_discount, 0), nullif(btrim(coalesce(p_notes, '')), ''))
  returning * into v_queue;

  return jsonb_build_object('id', v_queue.id, 'status', v_queue.status);
end;
$$;

create or replace function public.list_cashier_sale_queue()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'sellerName', coalesce(p.full_name, 'Vendeur'),
    'customerName', c.name,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'productId', product_id,
        'name', pr.name,
        'quantity', quantity,
        'unitPrice', pr.selling_price,
        'total', round(quantity * pr.selling_price, 2)
      ) order by pr.name)
      from jsonb_to_recordset(q.items) as item(product_id uuid, quantity numeric)
      join public.products pr on pr.id = item.product_id and pr.business_id = q.business_id
    ), '[]'::jsonb),
    'subtotal', coalesce((
      select sum(round(quantity * pr.selling_price, 2))
      from jsonb_to_recordset(q.items) as item(product_id uuid, quantity numeric)
      join public.products pr on pr.id = item.product_id and pr.business_id = q.business_id
    ), 0),
    'discount', q.discount,
    'notes', q.notes,
    'createdAt', q.created_at
  ) order by q.created_at asc), '[]'::jsonb)
  from public.cashier_sale_queue q
  left join public.profiles p on p.id = q.seller_id
  left join public.customers c on c.id = q.customer_id
  where q.business_id = public.current_business_id()
    and q.status = 'queued'
    and public.current_member_role() in ('owner', 'manager', 'cashier');
$$;

create or replace function public.complete_cashier_sale(
  p_queue_id uuid,
  p_payment_method text,
  p_amount_paid numeric
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_queue public.cashier_sale_queue;
  v_sale public.sales;
  v_role text := public.current_member_role();
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_role not in ('owner', 'manager', 'cashier') then raise exception 'FORBIDDEN'; end if;
  if v_role <> 'cashier' and public.cashier_checkout_is_required() then raise exception 'FORBIDDEN'; end if;

  select * into v_queue from public.cashier_sale_queue
  where id = p_queue_id and business_id = public.current_business_id()
  for update;
  if not found or v_queue.status <> 'queued' then raise exception 'SALE_NOT_FOUND'; end if;

  -- La création normale revalide le stock, calcule les montants et crée les mouvements.
  select * into v_sale from public.create_sale(
    v_queue.items,
    v_queue.discount,
    v_queue.customer_id,
    p_payment_method,
    p_amount_paid,
    v_queue.notes
  );

  -- Le vendeur reste attribué à la vente, même si l'encaissement est fait par la caisse.
  update public.sales set user_id = v_queue.seller_id where id = v_sale.id returning * into v_sale;
  update public.cashier_sale_queue
  set status = 'completed', processed_by = auth.uid(), completed_sale_id = v_sale.id
  where id = v_queue.id;

  return v_sale;
end;
$$;

revoke all on function public.queue_sale_for_cashier(jsonb, numeric, uuid, text) from public;
revoke all on function public.list_cashier_sale_queue() from public;
revoke all on function public.complete_cashier_sale(uuid, text, numeric) from public;
revoke all on function public.cashier_checkout_is_required() from public;
grant execute on function public.queue_sale_for_cashier(jsonb, numeric, uuid, text) to authenticated;
grant execute on function public.list_cashier_sale_queue() to authenticated;
grant execute on function public.complete_cashier_sale(uuid, text, numeric) to authenticated;
grant execute on function public.cashier_checkout_is_required() to authenticated;
