-- SamaGestion — paramètres commerce, reçus, préfixes, logo

alter table public.businesses
  add column if not exists city text,
  add column if not exists country text not null default 'Sénégal';

update public.businesses
set country = 'Sénégal'
where country is null or btrim(country) = '';

create table if not exists public.business_settings (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  receipt_prefix text not null default 'V',
  purchase_prefix text not null default 'A',
  receipt_width text not null default '80mm',
  show_logo boolean not null default true,
  show_phone boolean not null default true,
  show_address boolean not null default true,
  show_customer boolean not null default true,
  show_seller boolean not null default true,
  show_notes boolean not null default true,
  show_message boolean not null default true,
  receipt_message text default 'Merci pour votre achat !' || chr(10) || 'À bientôt.',
  legal_information text,
  timezone text not null default 'Africa/Dakar',
  locale text not null default 'fr',
  date_format text not null default 'short',
  number_format text not null default 'fr-FR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_settings_receipt_prefix_check
    check (receipt_prefix ~ '^[A-Z0-9]{1,8}$'),
  constraint business_settings_purchase_prefix_check
    check (purchase_prefix ~ '^[A-Z0-9]{1,8}$'),
  constraint business_settings_receipt_width_check
    check (receipt_width in ('58mm', '80mm', 'A4')),
  constraint business_settings_locale_check
    check (locale in ('fr', 'en', 'wo')),
  constraint business_settings_timezone_check
    check (timezone = 'Africa/Dakar')
);

insert into public.business_settings (business_id)
select id from public.businesses
on conflict (business_id) do nothing;

create or replace function public.ensure_business_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_settings (business_id)
  values (new.id)
  on conflict (business_id) do nothing;
  return new;
end;
$$;

drop trigger if exists businesses_ensure_settings on public.businesses;
create trigger businesses_ensure_settings
  after insert on public.businesses
  for each row execute procedure public.ensure_business_settings();

drop trigger if exists business_settings_set_updated_at on public.business_settings;
create trigger business_settings_set_updated_at
  before update on public.business_settings
  for each row execute procedure public.set_updated_at();

create or replace function public.next_sale_number(p_business_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number integer;
  v_prefix text := 'V';
begin
  select receipt_prefix into v_prefix
  from public.business_settings
  where business_id = p_business_id;

  v_prefix := coalesce(nullif(btrim(v_prefix), ''), 'V');

  insert into public.sale_counters (business_id, last_number)
  values (p_business_id, 1)
  on conflict (business_id)
  do update set last_number = public.sale_counters.last_number + 1
  returning last_number into v_number;

  return v_prefix || '-' || lpad(v_number::text, 6, '0');
end;
$$;

create or replace function public.next_purchase_number(p_business_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_number integer;
  v_prefix text := 'A';
begin
  select purchase_prefix into v_prefix
  from public.business_settings
  where business_id = p_business_id;

  v_prefix := coalesce(nullif(btrim(v_prefix), ''), 'A');

  insert into public.purchase_counters (business_id, last_number)
  values (p_business_id, 1)
  on conflict (business_id)
  do update set last_number = public.purchase_counters.last_number + 1
  returning last_number into v_number;

  return v_prefix || '-' || lpad(v_number::text, 6, '0');
end;
$$;

create or replace function public.update_business_profile(
  p_name text,
  p_phone text default null,
  p_email text default null,
  p_address text default null,
  p_city text default null,
  p_country text default 'Sénégal'
)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_business public.businesses;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;
  if not public.has_permission('settings.edit') then
    raise exception 'FORBIDDEN';
  end if;
  if p_name is null or btrim(p_name) = '' then
    raise exception 'BUSINESS_NAME_REQUIRED';
  end if;

  update public.businesses
  set
    name = btrim(p_name),
    phone = nullif(btrim(coalesce(p_phone, '')), ''),
    email = nullif(btrim(coalesce(p_email, '')), ''),
    address = nullif(btrim(coalesce(p_address, '')), ''),
    city = nullif(btrim(coalesce(p_city, '')), ''),
    country = coalesce(nullif(btrim(coalesce(p_country, '')), ''), 'Sénégal')
  where id = v_business_id
  returning * into v_business;

  perform public.write_audit_log(
    'settings.updated',
    'business',
    v_business_id,
    jsonb_build_object('section', 'profile', 'name', v_business.name)
  );

  return v_business;
end;
$$;

create or replace function public.set_business_logo(p_logo_url text)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_business public.businesses;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;
  if not public.has_permission('settings.edit') then
    raise exception 'FORBIDDEN';
  end if;

  update public.businesses
  set logo_url = nullif(btrim(coalesce(p_logo_url, '')), '')
  where id = v_business_id
  returning * into v_business;

  perform public.write_audit_log(
    'settings.updated',
    'business',
    v_business_id,
    jsonb_build_object('section', 'logo')
  );

  return v_business;
end;
$$;

create or replace function public.update_receipt_settings(
  p_receipt_prefix text,
  p_purchase_prefix text,
  p_receipt_width text,
  p_show_logo boolean,
  p_show_phone boolean,
  p_show_address boolean,
  p_show_customer boolean,
  p_show_seller boolean,
  p_show_notes boolean,
  p_show_message boolean,
  p_receipt_message text default null,
  p_legal_information text default null
)
returns public.business_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_settings public.business_settings;
  v_sale_prefix text;
  v_purchase_prefix text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;
  if not public.has_permission('settings.edit') then
    raise exception 'FORBIDDEN';
  end if;

  v_sale_prefix := upper(btrim(coalesce(p_receipt_prefix, 'V')));
  v_purchase_prefix := upper(btrim(coalesce(p_purchase_prefix, 'A')));

  if v_sale_prefix !~ '^[A-Z0-9]{1,8}$' then
    raise exception 'INVALID_RECEIPT_PREFIX';
  end if;
  if v_purchase_prefix !~ '^[A-Z0-9]{1,8}$' then
    raise exception 'INVALID_PURCHASE_PREFIX';
  end if;
  if p_receipt_width not in ('58mm', '80mm', 'A4') then
    raise exception 'INVALID_RECEIPT_WIDTH';
  end if;

  insert into public.business_settings (business_id)
  values (v_business_id)
  on conflict (business_id) do nothing;

  update public.business_settings
  set
    receipt_prefix = v_sale_prefix,
    purchase_prefix = v_purchase_prefix,
    receipt_width = p_receipt_width,
    show_logo = coalesce(p_show_logo, true),
    show_phone = coalesce(p_show_phone, true),
    show_address = coalesce(p_show_address, true),
    show_customer = coalesce(p_show_customer, true),
    show_seller = coalesce(p_show_seller, true),
    show_notes = coalesce(p_show_notes, true),
    show_message = coalesce(p_show_message, true),
    receipt_message = nullif(btrim(coalesce(p_receipt_message, '')), ''),
    legal_information = nullif(btrim(coalesce(p_legal_information, '')), '')
  where business_id = v_business_id
  returning * into v_settings;

  perform public.write_audit_log(
    'settings.updated',
    'receipt',
    v_business_id,
    jsonb_build_object(
      'section', 'receipt',
      'receipt_prefix', v_sale_prefix,
      'purchase_prefix', v_purchase_prefix,
      'receipt_width', p_receipt_width
    )
  );

  return v_settings;
end;
$$;

create or replace function public.update_business_preferences(
  p_locale text default 'fr',
  p_date_format text default 'short',
  p_number_format text default 'fr-FR'
)
returns public.business_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_settings public.business_settings;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;
  if not public.has_permission('settings.edit') then
    raise exception 'FORBIDDEN';
  end if;
  if p_locale not in ('fr', 'en', 'wo') then
    raise exception 'INVALID_LOCALE';
  end if;

  insert into public.business_settings (business_id)
  values (v_business_id)
  on conflict (business_id) do nothing;

  update public.business_settings
  set
    locale = p_locale,
    date_format = coalesce(nullif(btrim(p_date_format), ''), 'short'),
    number_format = coalesce(nullif(btrim(p_number_format), ''), 'fr-FR'),
    timezone = 'Africa/Dakar'
  where business_id = v_business_id
  returning * into v_settings;

  perform public.write_audit_log(
    'settings.updated',
    'preferences',
    v_business_id,
    jsonb_build_object('section', 'preferences', 'locale', p_locale)
  );

  return v_settings;
end;
$$;

alter table public.business_settings enable row level security;
alter table public.business_settings force row level security;

drop policy if exists "business_settings_member_select" on public.business_settings;
create policy "business_settings_member_select"
  on public.business_settings
  for select
  to authenticated
  using (public.is_business_member(business_id) and public.has_permission('settings.view'));

grant select on table public.business_settings to authenticated;

revoke all on function public.update_business_profile(text, text, text, text, text, text) from public;
revoke all on function public.set_business_logo(text) from public;
revoke all on function public.update_receipt_settings(text, text, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, text, text) from public;
revoke all on function public.update_business_preferences(text, text, text) from public;

grant execute on function public.update_business_profile(text, text, text, text, text, text) to authenticated;
grant execute on function public.set_business_logo(text) to authenticated;
grant execute on function public.update_receipt_settings(text, text, text, boolean, boolean, boolean, boolean, boolean, boolean, boolean, text, text) to authenticated;
grant execute on function public.update_business_preferences(text, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-logos',
  'business-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "business_logos_select" on storage.objects;
drop policy if exists "business_logos_insert_owner" on storage.objects;
drop policy if exists "business_logos_update_owner" on storage.objects;
drop policy if exists "business_logos_delete_owner" on storage.objects;

create policy "business_logos_select"
  on storage.objects
  for select
  to public
  using (bucket_id = 'business-logos');

create policy "business_logos_insert_owner"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'business-logos'
    and public.has_permission('settings.edit')
    and ((storage.foldername(name))[1])::uuid = public.current_business_id()
  );

create policy "business_logos_update_owner"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'business-logos'
    and public.has_permission('settings.edit')
    and ((storage.foldername(name))[1])::uuid = public.current_business_id()
  )
  with check (
    bucket_id = 'business-logos'
    and public.has_permission('settings.edit')
    and ((storage.foldername(name))[1])::uuid = public.current_business_id()
  );

create policy "business_logos_delete_owner"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'business-logos'
    and public.has_permission('settings.edit')
    and ((storage.foldername(name))[1])::uuid = public.current_business_id()
  );

-- Aligner settings.view avec le catalogue TypeScript (lecture seule)
create or replace function public.has_permission(p_permission text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text := public.current_member_role();
begin
  if v_role is null then
    return false;
  end if;

  if v_role = 'owner' then
    return true;
  end if;

  if v_role = 'manager' then
    return p_permission in (
      'dashboard.view',
      'sales.view', 'sales.create', 'sales.edit', 'sales.cancel', 'sales.list_all', 'sales.cancel_own',
      'customers.view', 'customers.create', 'customers.edit', 'customers.delete',
      'products.view', 'products.create', 'products.edit', 'products.delete', 'products.manage',
      'stock.view', 'stock.adjust',
      'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.cancel', 'purchases.manage',
      'suppliers.view', 'suppliers.create', 'suppliers.edit',
      'expenses.view', 'expenses.create', 'expenses.edit', 'expenses.delete', 'expenses.manage',
      'reports.view', 'reports.financial',
      'team.view',
      'settings.view'
    );
  end if;

  if v_role = 'cashier' then
    return p_permission in (
      'dashboard.view',
      'sales.view', 'sales.create', 'sales.cancel_own',
      'customers.view', 'customers.create', 'customers.edit',
      'products.view',
      'settings.view'
    );
  end if;

  if v_role = 'seller' then
    return p_permission in (
      'dashboard.view',
      'sales.view', 'sales.create',
      'customers.view', 'customers.create',
      'products.view',
      'settings.view'
    );
  end if;

  if v_role = 'stock_manager' then
    return p_permission in (
      'dashboard.view',
      'products.view', 'products.create', 'products.edit', 'products.delete', 'products.manage',
      'stock.view', 'stock.adjust',
      'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.cancel', 'purchases.manage',
      'suppliers.view', 'suppliers.create', 'suppliers.edit',
      'settings.view'
    );
  end if;

  return false;
end;
$$;
