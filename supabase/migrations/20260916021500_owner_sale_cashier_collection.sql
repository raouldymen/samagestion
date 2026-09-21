-- Les ventes validées par le propriétaire peuvent être signalées à la caisse pour remise effective de l'argent.
create table public.owner_sale_cashier_collections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  sale_id uuid not null unique references public.sales(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  amount numeric(12, 2) not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'collected')),
  collected_by uuid references auth.users(id) on delete set null,
  collected_at timestamptz,
  created_at timestamptz not null default now()
);

create index owner_sale_cashier_collections_pending_idx
  on public.owner_sale_cashier_collections (business_id, status, created_at asc);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'owner_sale_cashier_collections'
  ) then
    alter publication supabase_realtime add table public.owner_sale_cashier_collections;
  end if;
end;
$$;

alter table public.owner_sale_cashier_collections enable row level security;

create policy "owner_sale_collections_select"
  on public.owner_sale_cashier_collections for select to authenticated
  using (
    public.is_business_member(business_id)
    and public.current_member_role() in ('owner', 'manager', 'cashier')
  );

create or replace function public.create_owner_sale(
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
  v_sale public.sales;
  v_business_id uuid := public.current_business_id();
begin
  if auth.uid() is null or public.current_member_role() <> 'owner' then raise exception 'FORBIDDEN'; end if;

  perform set_config('app.owner_cashier_override', 'on', true);
  select * into v_sale from public.create_sale(
    p_items, p_discount, p_customer_id, p_payment_method, p_amount_paid, p_notes
  );

  insert into public.owner_sale_cashier_collections (business_id, sale_id, created_by, amount)
  values (v_business_id, v_sale.id, auth.uid(), v_sale.amount_paid);

  return v_sale;
end;
$$;

create or replace function public.list_owner_sale_collections()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', collection.id,
    'saleNumber', sale.sale_number,
    'amount', collection.amount,
    'paymentMethod', sale.payment_method,
    'ownerName', coalesce(profile.full_name, 'Propriétaire'),
    'createdAt', collection.created_at
  ) order by collection.created_at asc), '[]'::jsonb)
  from public.owner_sale_cashier_collections collection
  join public.sales sale on sale.id = collection.sale_id
  left join public.profiles profile on profile.id = collection.created_by
  where collection.business_id = public.current_business_id()
    and collection.status = 'pending'
    and public.current_member_role() in ('owner', 'manager', 'cashier');
$$;

create or replace function public.mark_owner_sale_collection(p_collection_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := public.current_member_role();
begin
  if auth.uid() is null or v_role not in ('owner', 'manager', 'cashier') then raise exception 'FORBIDDEN'; end if;
  if v_role <> 'cashier' and public.cashier_checkout_is_required() then raise exception 'FORBIDDEN'; end if;

  update public.owner_sale_cashier_collections
  set status = 'collected', collected_by = auth.uid(), collected_at = now()
  where id = p_collection_id
    and business_id = public.current_business_id()
    and status = 'pending';
  if not found then raise exception 'SALE_NOT_FOUND'; end if;
end;
$$;

revoke all on function public.create_owner_sale(jsonb, numeric, uuid, text, numeric, text) from public;
revoke all on function public.list_owner_sale_collections() from public;
revoke all on function public.mark_owner_sale_collection(uuid) from public;
grant execute on function public.create_owner_sale(jsonb, numeric, uuid, text, numeric, text) to authenticated;
grant execute on function public.list_owner_sale_collections() to authenticated;
grant execute on function public.mark_owner_sale_collection(uuid) to authenticated;
