-- SamaGestion — profils, commerces, membres, RLS
-- Appliquer via l'éditeur SQL Supabase ou `supabase db push`.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  address text,
  logo_url text,
  currency text not null default 'XOF',
  owner_id uuid references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_name_not_empty check (length(btrim(name)) > 0),
  constraint businesses_currency_xof check (currency = 'XOF')
);

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now(),
  constraint business_members_role_check
    check (role in ('owner', 'manager', 'cashier', 'seller')),
  constraint business_members_unique_member unique (business_id, user_id)
);

create index business_members_user_id_idx on public.business_members (user_id);
create index business_members_business_id_idx on public.business_members (business_id);
create index businesses_owner_id_idx on public.businesses (owner_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger businesses_set_updated_at
  before update on public.businesses
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profil automatique à l'inscription
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '')
  )
  on conflict (id) do nothing;

  return new;
exception
  when others then
    raise warning 'SamaGestion: impossible de créer le profil % : %', new.id, sqlerrm;
    return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helpers RLS (security definer pour éviter la récursion)
-- ---------------------------------------------------------------------------

create or replace function public.is_business_member(p_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members
    where business_id = p_business_id
      and user_id = auth.uid()
  );
$$;

-- Création atomique commerce + membre propriétaire.
-- Ne jamais faire confiance à un business_id ou owner_id envoyé par le client.
create or replace function public.create_business(
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_address text default null
)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_business public.businesses;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if p_name is null or btrim(p_name) = '' then
    raise exception 'BUSINESS_NAME_REQUIRED';
  end if;

  insert into public.businesses (
    name,
    phone,
    email,
    address,
    currency,
    owner_id
  )
  values (
    btrim(p_name),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(btrim(coalesce(p_email, '')), ''),
    nullif(btrim(coalesce(p_address, '')), ''),
    'XOF',
    v_user_id
  )
  returning * into v_business;

  insert into public.business_members (business_id, user_id, role)
  values (v_business.id, v_user_id, 'owner');

  return v_business;
end;
$$;

revoke all on function public.is_business_member(uuid) from public;
revoke all on function public.create_business(text, text, text, text) from public;

grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.create_business(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;

alter table public.profiles force row level security;
alter table public.businesses force row level security;
alter table public.business_members force row level security;

-- profiles
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

-- businesses
create policy "businesses_select_member"
  on public.businesses
  for select
  to authenticated
  using (
    owner_id = auth.uid()
    or public.is_business_member(id)
  );

create policy "businesses_insert_owner"
  on public.businesses
  for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "businesses_update_owner"
  on public.businesses
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- business_members
create policy "business_members_select_own_or_comembers"
  on public.business_members
  for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_business_member(business_id)
  );

create policy "business_members_insert_initial_owner"
  on public.business_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and role = 'owner'
    and exists (
      select 1
      from public.businesses
      where id = business_id
        and owner_id = auth.uid()
    )
  );

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update on table public.businesses to authenticated;
grant select, insert on table public.business_members to authenticated;
