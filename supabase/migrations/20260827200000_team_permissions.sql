-- SamaGestion — équipe, invitations, permissions, audit
-- Complète business_members (pas de seconde table membres).

-- ---------------------------------------------------------------------------
-- Membres : statut, updated_at, rôle stock_manager
-- ---------------------------------------------------------------------------

alter table public.business_members
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz not null default now();

update public.business_members set status = 'active' where status is null or status = '';

alter table public.business_members
  drop constraint if exists business_members_role_check;

alter table public.business_members
  add constraint business_members_role_check
  check (role in ('owner', 'manager', 'cashier', 'seller', 'stock_manager'));

alter table public.business_members
  drop constraint if exists business_members_status_check;

alter table public.business_members
  add constraint business_members_status_check
  check (status in ('active', 'invited', 'suspended'));

drop trigger if exists business_members_set_updated_at on public.business_members;
create trigger business_members_set_updated_at
  before update on public.business_members
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS : membre = actif uniquement
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
      and status = 'active'
  );
$$;

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
    and status = 'active'
  order by created_at asc
  limit 1
$$;

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
    and status = 'active'
  limit 1
$$;

create or replace function public.current_member_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select status
  from public.business_members
  where user_id = auth.uid()
  order by created_at asc
  limit 1
$$;

-- Lecture du commerce même si suspendu (pour afficher l'écran d'accès refusé)
drop policy if exists "businesses_select_member" on public.businesses;
create policy "businesses_select_member"
  on public.businesses
  for select
  to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.business_members as m
      where m.business_id = businesses.id
        and m.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Permissions SQL (miroir de src/lib/auth/permissions.ts)
-- ---------------------------------------------------------------------------

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
      'customers.view', 'customers.create', 'customers.edit'
    );
  end if;

  if v_role = 'seller' then
    return p_permission in (
      'dashboard.view',
      'sales.view', 'sales.create',
      'customers.view', 'customers.create',
      'products.view'
    );
  end if;

  if v_role = 'stock_manager' then
    return p_permission in (
      'dashboard.view',
      'products.view', 'products.create', 'products.edit', 'products.delete', 'products.manage',
      'stock.view', 'stock.adjust',
      'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.cancel', 'purchases.manage',
      'suppliers.view', 'suppliers.create', 'suppliers.edit'
    );
  end if;

  return false;
end;
$$;

-- ---------------------------------------------------------------------------
-- Owner principal protégé
-- ---------------------------------------------------------------------------

create or replace function public.protect_primary_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select owner_id into v_owner from public.businesses where id = coalesce(new.business_id, old.business_id);

  if tg_op = 'DELETE' then
    if old.role = 'owner' or old.user_id = v_owner then
      raise exception 'OWNER_PROTECTED';
    end if;
    return old;
  end if;

  if old.role = 'owner' or old.user_id = v_owner then
    if new.role is distinct from 'owner' then
      raise exception 'OWNER_PROTECTED';
    end if;
    if new.status is distinct from 'active' then
      raise exception 'OWNER_PROTECTED';
    end if;
    if new.user_id is distinct from old.user_id then
      raise exception 'OWNER_PROTECTED';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists business_members_protect_owner on public.business_members;
create trigger business_members_protect_owner
  before update or delete on public.business_members
  for each row execute procedure public.protect_primary_owner();

-- ---------------------------------------------------------------------------
-- Invitations
-- ---------------------------------------------------------------------------

create table public.business_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  email text not null,
  role text not null,
  token text not null,
  status text not null default 'pending',
  expires_at timestamptz not null,
  invited_by uuid not null references auth.users (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint business_invitations_email_not_empty check (length(btrim(email)) > 0),
  constraint business_invitations_role_check
    check (role in ('manager', 'cashier', 'seller', 'stock_manager')),
  constraint business_invitations_status_check
    check (status in ('pending', 'accepted', 'expired', 'cancelled')),
  constraint business_invitations_token_unique unique (token)
);

create index business_invitations_business_id_idx on public.business_invitations (business_id);
create index business_invitations_email_idx on public.business_invitations (lower(email));

-- ---------------------------------------------------------------------------
-- Audit
-- ---------------------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete restrict,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_business_created_idx on public.audit_logs (business_id, created_at desc);
create index audit_logs_user_idx on public.audit_logs (business_id, user_id);

create or replace function public.write_audit_log(
  p_action text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_metadata jsonb default '{}'::jsonb,
  p_business_id uuid default null,
  p_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := coalesce(p_business_id, public.current_business_id());
  v_user_id uuid := coalesce(p_user_id, auth.uid());
begin
  if v_business_id is null or v_user_id is null or p_action is null then
    return;
  end if;

  insert into public.audit_logs (business_id, user_id, action, entity_type, entity_id, metadata)
  values (v_business_id, v_user_id, p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

create or replace function public.audit_from_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_entity text := tg_argv[0];
  v_id uuid;
  v_business uuid;
  v_meta jsonb := '{}'::jsonb;
begin
  if tg_op = 'INSERT' then
    v_action := v_entity || '.created';
    v_id := new.id;
    v_business := new.business_id;
    if v_entity = 'sale' then
      v_meta := jsonb_build_object('sale_number', new.sale_number, 'total', new.total);
    elsif v_entity = 'purchase' then
      v_meta := jsonb_build_object('purchase_number', new.purchase_number, 'total', new.total);
    elsif v_entity = 'product' then
      v_meta := jsonb_build_object('name', new.name);
    elsif v_entity = 'customer' then
      v_meta := jsonb_build_object('name', new.name);
    elsif v_entity = 'supplier' then
      v_meta := jsonb_build_object('name', new.name);
    elsif v_entity = 'expense' then
      v_meta := jsonb_build_object('description', new.description, 'amount', new.amount);
    end if;
    perform public.write_audit_log(v_action, v_entity, v_id, v_meta, v_business, auth.uid());
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if v_entity = 'sale' and new.status = 'cancelled' and old.status is distinct from 'cancelled' then
      perform public.write_audit_log(
        'sale.cancelled', 'sale', new.id,
        jsonb_build_object('sale_number', new.sale_number), new.business_id, auth.uid()
      );
    elsif v_entity = 'purchase' and new.status = 'cancelled' and old.status is distinct from 'cancelled' then
      perform public.write_audit_log(
        'purchase.cancelled', 'purchase', new.id,
        jsonb_build_object('purchase_number', new.purchase_number), new.business_id, auth.uid()
      );
    elsif v_entity = 'expense' and new.status = 'cancelled' and old.status is distinct from 'cancelled' then
      perform public.write_audit_log('expense.cancelled', 'expense', new.id, '{}'::jsonb, new.business_id, auth.uid());
    elsif v_entity = 'expense' and new.status is not distinct from old.status then
      perform public.write_audit_log('expense.updated', 'expense', new.id, '{}'::jsonb, new.business_id, auth.uid());
    elsif v_entity = 'product' then
      if new.is_active = false and old.is_active = true then
        perform public.write_audit_log(
          'product.deleted', 'product', new.id, jsonb_build_object('name', new.name), new.business_id, auth.uid()
        );
      elsif new.stock_quantity is not distinct from old.stock_quantity then
        perform public.write_audit_log(
          'product.updated', 'product', new.id, jsonb_build_object('name', new.name), new.business_id, auth.uid()
        );
      end if;
    elsif v_entity = 'customer' then
      perform public.write_audit_log('customer.updated', 'customer', new.id, jsonb_build_object('name', new.name), new.business_id, auth.uid());
    elsif v_entity = 'supplier' then
      perform public.write_audit_log('supplier.updated', 'supplier', new.id, jsonb_build_object('name', new.name), new.business_id, auth.uid());
    end if;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists sales_audit on public.sales;
create trigger sales_audit
  after insert or update on public.sales
  for each row execute procedure public.audit_from_row('sale');

drop trigger if exists purchases_audit on public.purchases;
create trigger purchases_audit
  after insert or update on public.purchases
  for each row execute procedure public.audit_from_row('purchase');

drop trigger if exists products_audit on public.products;
create trigger products_audit
  after insert or update on public.products
  for each row execute procedure public.audit_from_row('product');

drop trigger if exists expenses_audit on public.expenses;
create trigger expenses_audit
  after insert or update on public.expenses
  for each row execute procedure public.audit_from_row('expense');

drop trigger if exists customers_audit on public.customers;
create trigger customers_audit
  after insert or update on public.customers
  for each row execute procedure public.audit_from_row('customer');

drop trigger if exists suppliers_audit on public.suppliers;
create trigger suppliers_audit
  after insert or update on public.suppliers
  for each row execute procedure public.audit_from_row('supplier');

create or replace function public.audit_stock_adjustment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type = 'adjustment' then
    perform public.write_audit_log(
      'stock.adjusted',
      'product',
      new.product_id,
      jsonb_build_object('quantity', new.quantity, 'reason', new.reason),
      new.business_id,
      new.created_by
    );
  end if;
  return new;
end;
$$;

drop trigger if exists stock_movements_audit on public.stock_movements;
create trigger stock_movements_audit
  after insert on public.stock_movements
  for each row execute procedure public.audit_stock_adjustment();

-- ---------------------------------------------------------------------------
-- RPCs équipe
-- ---------------------------------------------------------------------------

create or replace function public.invite_business_member(p_email text, p_role text)
returns public.business_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_user_id uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_invite public.business_invitations;
  v_existing uuid;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;
  if not public.has_permission('team.invite') then
    raise exception 'FORBIDDEN';
  end if;
  if v_email = '' or v_email !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'INVALID_EMAIL';
  end if;
  if p_role not in ('manager', 'cashier', 'seller', 'stock_manager') then
    raise exception 'INVALID_ROLE';
  end if;

  select u.id into v_existing
  from auth.users as u
  where lower(u.email) = v_email
  limit 1;

  if v_existing is not null and exists (
    select 1 from public.business_members
    where business_id = v_business_id and user_id = v_existing and status = 'active'
  ) then
    raise exception 'ALREADY_MEMBER';
  end if;

  update public.business_invitations
  set status = 'cancelled'
  where business_id = v_business_id
    and lower(email) = v_email
    and status = 'pending';

  insert into public.business_invitations (
    business_id, email, role, token, status, expires_at, invited_by
  )
  values (
    v_business_id,
    v_email,
    p_role,
    encode(gen_random_bytes(32), 'hex'),
    'pending',
    now() + interval '7 days',
    v_user_id
  )
  returning * into v_invite;

  perform public.write_audit_log(
    'member.invited',
    'invitation',
    v_invite.id,
    jsonb_build_object('email', v_email, 'role', p_role)
  );

  return v_invite;
end;
$$;

create or replace function public.get_invitation_by_token(p_token text)
returns table (
  id uuid,
  business_id uuid,
  business_name text,
  email text,
  role text,
  status text,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  return query
  select
    i.id,
    i.business_id,
    b.name,
    i.email,
    i.role,
    case
      when i.status = 'pending' and i.expires_at < now() then 'expired'
      else i.status
    end,
    i.expires_at
  from public.business_invitations as i
  inner join public.businesses as b on b.id = i.business_id
  where i.token = p_token
  limit 1;
end;
$$;

create or replace function public.accept_invitation(p_token text)
returns public.business_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.business_invitations;
  v_member public.business_members;
  v_email text;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_invite from public.business_invitations where token = p_token for update;

  if not found then
    raise exception 'INVITATION_NOT_FOUND';
  end if;

  if v_invite.status = 'cancelled' then
    raise exception 'INVITATION_CANCELLED';
  end if;

  if v_invite.status = 'accepted' then
    raise exception 'INVITATION_ACCEPTED';
  end if;

  if v_invite.expires_at < now() or v_invite.status = 'expired' then
    update public.business_invitations set status = 'expired' where id = v_invite.id;
    raise exception 'INVITATION_EXPIRED';
  end if;

  select lower(email) into v_email from auth.users where id = v_user_id;
  if v_email is distinct from lower(v_invite.email) then
    raise exception 'INVITATION_EMAIL_MISMATCH';
  end if;

  insert into public.business_members (business_id, user_id, role, status)
  values (v_invite.business_id, v_user_id, v_invite.role, 'active')
  on conflict (business_id, user_id) do update
    set role = excluded.role,
        status = 'active'
  returning * into v_member;

  update public.business_invitations set status = 'accepted' where id = v_invite.id;

  perform public.write_audit_log(
    'member.invited',
    'member',
    v_member.id,
    jsonb_build_object('role', v_member.role, 'accepted', true),
    v_invite.business_id,
    v_user_id
  );

  return v_member;
end;
$$;

create or replace function public.decline_invitation(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.business_invitations;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_invite from public.business_invitations where token = p_token for update;
  if not found then
    raise exception 'INVITATION_NOT_FOUND';
  end if;

  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is distinct from lower(v_invite.email) then
    raise exception 'INVITATION_EMAIL_MISMATCH';
  end if;

  if v_invite.status = 'pending' then
    update public.business_invitations set status = 'cancelled' where id = v_invite.id;
  end if;
end;
$$;

create or replace function public.update_member_role(p_member_id uuid, p_role text)
returns public.business_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.business_members;
  v_previous text;
begin
  if not public.has_permission('team.edit_role') then
    raise exception 'FORBIDDEN';
  end if;
  if p_role not in ('manager', 'cashier', 'seller', 'stock_manager') then
    raise exception 'INVALID_ROLE';
  end if;

  select * into v_member from public.business_members where id = p_member_id;
  if not found or v_member.business_id is distinct from public.current_business_id() then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  v_previous := v_member.role;

  update public.business_members
  set role = p_role
  where id = p_member_id
  returning * into v_member;

  perform public.write_audit_log(
    'member.role_changed',
    'member',
    v_member.id,
    jsonb_build_object('from', v_previous, 'to', p_role)
  );

  return v_member;
end;
$$;

create or replace function public.set_member_status(p_member_id uuid, p_status text)
returns public.business_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member public.business_members;
begin
  if p_status = 'suspended' and not public.has_permission('team.suspend') then
    raise exception 'FORBIDDEN';
  end if;
  if p_status = 'active' and not public.has_permission('team.suspend') then
    raise exception 'FORBIDDEN';
  end if;
  if p_status not in ('active', 'suspended') then
    raise exception 'INVALID_STATUS';
  end if;

  select * into v_member from public.business_members where id = p_member_id;
  if not found or v_member.business_id is distinct from public.current_business_id() then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  update public.business_members
  set status = p_status
  where id = p_member_id
  returning * into v_member;

  perform public.write_audit_log(
    case when p_status = 'suspended' then 'member.suspended' else 'member.role_changed' end,
    'member',
    v_member.id,
    jsonb_build_object('status', p_status)
  );

  return v_member;
end;
$$;

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

  delete from public.business_members where id = p_member_id;
end;
$$;

create or replace function public.list_team_members()
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  role text,
  status text,
  created_at timestamptz,
  last_activity_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;
  if not public.has_permission('team.view') then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    m.id,
    m.user_id,
    coalesce(p.full_name, split_part(u.email, '@', 1), 'Membre'),
    u.email,
    m.role,
    m.status,
    m.created_at,
    coalesce(
      (select max(a.created_at) from public.audit_logs as a
        where a.business_id = m.business_id and a.user_id = m.user_id),
      m.updated_at,
      m.created_at
    )
  from public.business_members as m
  inner join auth.users as u on u.id = m.user_id
  left join public.profiles as p on p.id = m.user_id
  where m.business_id = v_business_id
  order by
    case m.role when 'owner' then 0 when 'manager' then 1 else 2 end,
    m.created_at;
end;
$$;

create or replace function public.list_business_invitations()
returns setof public.business_invitations
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_permission('team.view') then
    raise exception 'FORBIDDEN';
  end if;

  update public.business_invitations
  set status = 'expired'
  where business_id = public.current_business_id()
    and status = 'pending'
    and expires_at < now();

  return query
  select *
  from public.business_invitations
  where business_id = public.current_business_id()
  order by created_at desc;
end;
$$;

create or replace function public.resend_invitation(p_invitation_id uuid)
returns public.business_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.business_invitations;
begin
  if not public.has_permission('team.invite') then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_invite
  from public.business_invitations
  where id = p_invitation_id
    and business_id = public.current_business_id();

  if not found then
    raise exception 'INVITATION_NOT_FOUND';
  end if;

  update public.business_invitations
  set
    token = encode(gen_random_bytes(32), 'hex'),
    status = 'pending',
    expires_at = now() + interval '7 days'
  where id = v_invite.id
  returning * into v_invite;

  perform public.write_audit_log(
    'member.invited',
    'invitation',
    v_invite.id,
    jsonb_build_object('email', v_invite.email, 'resent', true)
  );

  return v_invite;
end;
$$;

-- create_business : membre actif
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

  insert into public.businesses (name, phone, email, address, currency, owner_id)
  values (
    btrim(p_name),
    nullif(btrim(coalesce(p_phone, '')), ''),
    nullif(btrim(coalesce(p_email, '')), ''),
    nullif(btrim(coalesce(p_address, '')), ''),
    'XOF',
    v_user_id
  )
  returning * into v_business;

  insert into public.business_members (business_id, user_id, role, status)
  values (v_business.id, v_user_id, 'owner', 'active');

  return v_business;
end;
$$;

-- Notifications : stock_manager reçoit les alertes stock / achats
create or replace function public.notification_role_allowed(p_role text, p_type text)
returns boolean
language sql
immutable
as $$
  select case p_type
    when 'sale_completed' then p_role in ('owner', 'manager', 'cashier', 'seller')
    when 'payment_received' then p_role in ('owner', 'manager', 'cashier')
    when 'low_stock' then p_role in ('owner', 'manager', 'stock_manager')
    when 'out_of_stock' then p_role in ('owner', 'manager', 'stock_manager')
    when 'purchase_completed' then p_role in ('owner', 'manager', 'stock_manager')
    when 'supplier_debt' then p_role in ('owner', 'manager', 'stock_manager')
    when 'system' then p_role in ('owner', 'manager')
    else p_role in ('owner', 'manager')
  end;
$$;

-- ---------------------------------------------------------------------------
-- RLS invitations + audit
-- ---------------------------------------------------------------------------

alter table public.business_invitations enable row level security;
alter table public.business_invitations force row level security;
alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;

create policy "invitations_member_select"
  on public.business_invitations
  for select
  to authenticated
  using (public.is_business_member(business_id) and public.has_permission('team.view'));

create policy "audit_logs_member_select"
  on public.audit_logs
  for select
  to authenticated
  using (public.is_business_member(business_id) and public.has_permission('team.view'));

grant select on table public.business_invitations to authenticated;
grant select on table public.audit_logs to authenticated;

revoke all on function public.has_permission(text) from public;
revoke all on function public.current_member_status() from public;
revoke all on function public.write_audit_log(text, text, uuid, jsonb, uuid, uuid) from public;
revoke all on function public.invite_business_member(text, text) from public;
revoke all on function public.get_invitation_by_token(text) from public;
revoke all on function public.accept_invitation(text) from public;
revoke all on function public.decline_invitation(text) from public;
revoke all on function public.update_member_role(uuid, text) from public;
revoke all on function public.set_member_status(uuid, text) from public;
revoke all on function public.remove_business_member(uuid) from public;
revoke all on function public.list_team_members() from public;
revoke all on function public.list_business_invitations() from public;
revoke all on function public.resend_invitation(uuid) from public;

grant execute on function public.has_permission(text) to authenticated;
grant execute on function public.current_member_status() to authenticated;
grant execute on function public.invite_business_member(text, text) to authenticated;
grant execute on function public.get_invitation_by_token(text) to authenticated;
grant execute on function public.accept_invitation(text) to authenticated;
grant execute on function public.decline_invitation(text) to authenticated;
grant execute on function public.update_member_role(uuid, text) to authenticated;
grant execute on function public.set_member_status(uuid, text) to authenticated;
grant execute on function public.remove_business_member(uuid) to authenticated;
grant execute on function public.list_team_members() to authenticated;
grant execute on function public.list_business_invitations() to authenticated;
grant execute on function public.resend_invitation(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS données : permission + membre actif
-- ---------------------------------------------------------------------------

drop policy if exists "expenses_member_select" on public.expenses;
create policy "expenses_member_select"
  on public.expenses
  for select
  to authenticated
  using (public.is_business_member(business_id) and public.has_permission('expenses.view'));

drop policy if exists "expense_categories_member_select" on public.expense_categories;
create policy "expense_categories_member_select"
  on public.expense_categories
  for select
  to authenticated
  using (public.is_business_member(business_id) and public.has_permission('expenses.view'));

drop policy if exists "purchases_member_select" on public.purchases;
create policy "purchases_member_select"
  on public.purchases
  for select
  to authenticated
  using (public.is_business_member(business_id) and public.has_permission('purchases.view'));

drop policy if exists "purchase_items_member_select" on public.purchase_items;
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
        and public.has_permission('purchases.view')
    )
  );

drop policy if exists "suppliers_member_select" on public.suppliers;
create policy "suppliers_member_select"
  on public.suppliers
  for select
  to authenticated
  using (public.is_business_member(business_id) and public.has_permission('suppliers.view'));

drop policy if exists "products_member_select" on public.products;
create policy "products_member_select"
  on public.products
  for select
  to authenticated
  using (public.is_business_member(business_id) and public.has_permission('products.view'));

drop policy if exists "products_member_update" on public.products;
create policy "products_member_update"
  on public.products
  for update
  to authenticated
  using (public.is_business_member(business_id) and public.has_permission('products.edit'))
  with check (public.is_business_member(business_id) and public.has_permission('products.edit'));

drop policy if exists "categories_member_all" on public.categories;
create policy "categories_member_all"
  on public.categories
  for all
  to authenticated
  using (public.is_business_member(business_id) and public.has_permission('products.view'))
  with check (public.is_business_member(business_id) and public.has_permission('products.edit'));

drop policy if exists "stock_movements_member_select" on public.stock_movements;
create policy "stock_movements_member_select"
  on public.stock_movements
  for select
  to authenticated
  using (public.is_business_member(business_id) and public.has_permission('stock.view'));

drop policy if exists "sales_member_select" on public.sales;
create policy "sales_member_select"
  on public.sales
  for select
  to authenticated
  using (
    public.is_business_member(business_id)
    and public.has_permission('sales.view')
    and (
      public.has_permission('sales.list_all')
      or user_id = auth.uid()
    )
  );

drop policy if exists "sale_items_member_select" on public.sale_items;
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
        and public.has_permission('sales.view')
        and (
          public.has_permission('sales.list_all')
          or sale.user_id = auth.uid()
        )
    )
  );

drop policy if exists "customers_member_select" on public.customers;
create policy "customers_member_select"
  on public.customers
  for select
  to authenticated
  using (public.is_business_member(business_id) and public.has_permission('customers.view'));

-- Stock manuel : adjustment uniquement si stock.adjust
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

  if p_type in ('adjustment', 'loss') and not public.has_permission('stock.adjust') then
    raise exception 'FORBIDDEN';
  end if;

  if p_type = 'purchase' and not public.has_permission('purchases.create') then
    raise exception 'FORBIDDEN';
  end if;

  if p_type = 'sale' and not public.has_permission('sales.create') then
    raise exception 'FORBIDDEN';
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
    business_id, product_id, type, quantity, previous_stock, new_stock, reason, reference_id, created_by
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

-- Achats / fournisseurs : stock_manager
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

  if not public.has_permission('suppliers.create') then
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

  if not public.has_permission('suppliers.edit') then
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

  if not public.has_permission('purchases.create') then
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
    business_id, supplier_id, purchase_number, subtotal, discount, total,
    amount_paid, amount_due, payment_status, payment_method, status, notes, purchase_date, created_by
  )
  values (
    v_business_id, p_supplier_id, v_purchase_number, v_subtotal, v_discount, v_total,
    v_amount_paid, v_amount_due, v_payment_status, v_payment_method, 'completed',
    nullif(btrim(coalesce(p_notes, '')), ''), v_purchase_date, v_user_id
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
    select * into v_product from public.products where id = v_item.product_id;
    v_line_total := round(v_item.quantity * v_item.unit_cost, 2);

    insert into public.purchase_items (
      purchase_id, product_id, product_name, quantity, unit_cost, total
    )
    values (
      v_purchase.id, v_product.id, v_product.name, v_item.quantity, v_item.unit_cost, v_line_total
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

  if not public.has_permission('purchases.cancel') then
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

-- Dashboard financier : ne jamais renvoyer bénéfice / marge / dépenses sans permission
alter function public.get_dashboard_bundle(timestamptz, timestamptz, timestamptz, timestamptz)
  rename to get_dashboard_bundle_internal;

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
begin
  if not public.has_permission('reports.financial') then
    raise exception 'FORBIDDEN';
  end if;

  return public.get_dashboard_bundle_internal(p_from, p_to, p_prev_from, p_prev_to);
end;
$$;

revoke all on function public.get_dashboard_bundle_internal(timestamptz, timestamptz, timestamptz, timestamptz) from public;
revoke all on function public.get_dashboard_bundle_internal(timestamptz, timestamptz, timestamptz, timestamptz) from authenticated;

create or replace function public.get_my_sales_today()
returns table (
  sales_count bigint,
  total numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint,
    coalesce(sum(s.total), 0)
  from public.sales as s
  where s.business_id = public.current_business_id()
    and s.user_id = auth.uid()
    and s.status = 'completed'
    and s.created_at >= timezone('Africa/Dakar', timezone('Africa/Dakar', now())::date::timestamp)
    and s.created_at < timezone('Africa/Dakar', (timezone('Africa/Dakar', now())::date + 1)::timestamp);
$$;

revoke all on function public.get_my_sales_today() from public;
grant execute on function public.get_my_sales_today() to authenticated;
grant execute on function public.get_dashboard_bundle(timestamptz, timestamptz, timestamptz, timestamptz) to authenticated;
