-- SamaGestion — notifications internes (in-app). Canaux WhatsApp / SMS / email / push plus tard.

alter table public.businesses
  add column if not exists customer_debt_alert_threshold numeric(12, 2) not null default 100000;

alter table public.businesses
  add constraint businesses_debt_alert_threshold_positive
  check (customer_debt_alert_threshold >= 0);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  priority text not null default 'medium',
  channel text not null default 'in_app',
  is_read boolean not null default false,
  is_resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_check check (type in (
    'low_stock',
    'out_of_stock',
    'customer_debt',
    'old_customer_debt',
    'supplier_debt',
    'sale_completed',
    'purchase_completed',
    'payment_received',
    'system'
  )),
  constraint notifications_priority_check check (priority in ('critical', 'high', 'medium', 'low')),
  constraint notifications_channel_check check (channel in ('in_app', 'email', 'sms', 'whatsapp', 'push')),
  constraint notifications_title_not_empty check (length(btrim(title)) > 0)
);

create index notifications_user_unread_idx
  on public.notifications (business_id, user_id, created_at desc)
  where is_read = false;

create index notifications_user_list_idx
  on public.notifications (business_id, user_id, created_at desc);

create unique index notifications_active_alert_uidx
  on public.notifications (business_id, user_id, type, entity_id)
  where is_resolved = false
    and entity_id is not null
    and type in (
      'low_stock',
      'out_of_stock',
      'customer_debt',
      'old_customer_debt',
      'supplier_debt'
    );

create table public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  low_stock boolean not null default true,
  out_of_stock boolean not null default true,
  customer_debt boolean not null default true,
  old_customer_debt boolean not null default true,
  supplier_debt boolean not null default true,
  sale_completed boolean not null default false,
  purchase_completed boolean not null default true,
  payment_received boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_settings_unique_member unique (business_id, user_id)
);

create trigger notification_settings_set_updated_at
  before update on public.notification_settings
  for each row execute procedure public.set_updated_at();

create or replace function public.format_fcfa_amount(p_amount numeric)
returns text
language sql
immutable
as $$
  select replace(trim(to_char(round(coalesce(p_amount, 0)), 'FM999,999,999')), ',', ' ') || ' FCFA';
$$;

create or replace function public.notification_priority_for(p_type text)
returns text
language sql
immutable
as $$
  select case p_type
    when 'out_of_stock' then 'critical'
    when 'old_customer_debt' then 'high'
    when 'customer_debt' then 'high'
    when 'supplier_debt' then 'high'
    when 'low_stock' then 'medium'
    when 'purchase_completed' then 'medium'
    when 'payment_received' then 'medium'
    else 'low'
  end;
$$;

create or replace function public.notification_role_allowed(p_role text, p_type text)
returns boolean
language sql
immutable
as $$
  select case p_type
    when 'sale_completed' then p_role in ('owner', 'manager', 'cashier', 'seller')
    when 'payment_received' then p_role in ('owner', 'manager', 'cashier')
    when 'system' then p_role in ('owner', 'manager')
    else p_role in ('owner', 'manager')
  end;
$$;

create or replace function public.ensure_notification_settings(p_business_id uuid, p_user_id uuid)
returns public.notification_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.notification_settings;
begin
  insert into public.notification_settings (business_id, user_id)
  values (p_business_id, p_user_id)
  on conflict (business_id, user_id) do update
    set updated_at = public.notification_settings.updated_at
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.setting_enabled_for(
  p_settings public.notification_settings,
  p_type text
)
returns boolean
language sql
immutable
as $$
  select case p_type
    when 'low_stock' then p_settings.low_stock
    when 'out_of_stock' then p_settings.out_of_stock
    when 'customer_debt' then p_settings.customer_debt
    when 'old_customer_debt' then p_settings.old_customer_debt
    when 'supplier_debt' then p_settings.supplier_debt
    when 'sale_completed' then p_settings.sale_completed
    when 'purchase_completed' then p_settings.purchase_completed
    when 'payment_received' then p_settings.payment_received
    else true
  end;
$$;

create or replace function public.resolve_notification_alerts(
  p_business_id uuid,
  p_type text,
  p_entity_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set
    is_resolved = true,
    resolved_at = coalesce(resolved_at, now()),
    is_read = true
  where business_id = p_business_id
    and type = p_type
    and entity_id = p_entity_id
    and is_resolved = false;
end;
$$;

create or replace function public.create_in_app_notification(
  p_business_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_priority text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
  v_settings public.notification_settings;
  v_priority text := coalesce(p_priority, public.notification_priority_for(p_type));
  v_is_alert boolean := p_type in (
    'low_stock', 'out_of_stock', 'customer_debt', 'old_customer_debt', 'supplier_debt'
  );
  v_created integer := 0;
begin
  if p_business_id is null or not public.is_business_member(p_business_id) then
    raise exception 'FORBIDDEN';
  end if;
  for v_member in
    select user_id, role
    from public.business_members
    where business_id = p_business_id
  loop
    if not public.notification_role_allowed(v_member.role, p_type) then
      continue;
    end if;

    v_settings := public.ensure_notification_settings(p_business_id, v_member.user_id);

    if not public.setting_enabled_for(v_settings, p_type) then
      continue;
    end if;

    if v_is_alert and p_entity_id is not null and exists (
      select 1
      from public.notifications
      where business_id = p_business_id
        and user_id = v_member.user_id
        and type = p_type
        and entity_id = p_entity_id
        and is_resolved = false
    ) then
      continue;
    end if;

    begin
      insert into public.notifications (
        business_id,
        user_id,
        type,
        title,
        message,
        entity_type,
        entity_id,
        priority,
        channel
      )
      values (
        p_business_id,
        v_member.user_id,
        p_type,
        p_title,
        p_message,
        p_entity_type,
        p_entity_id,
        v_priority,
        'in_app'
      );
      v_created := v_created + 1;
    exception
      when unique_violation then
        null;
    end;
  end loop;

  return v_created;
end;
$$;

create or replace function public.create_stock_alert(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
begin
  select * into v_product from public.products where id = p_product_id;

  if not found then
    return;
  end if;

  if not public.is_business_member(v_product.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  if not v_product.is_active then
    perform public.resolve_notification_alerts(v_product.business_id, 'low_stock', v_product.id);
    perform public.resolve_notification_alerts(v_product.business_id, 'out_of_stock', v_product.id);
    return;
  end if;

  if v_product.stock_quantity <= 0 then
    perform public.resolve_notification_alerts(v_product.business_id, 'low_stock', v_product.id);
    perform public.create_in_app_notification(
      v_product.business_id,
      'out_of_stock',
      'Rupture de stock',
      'Le produit "' || v_product.name || '" est en rupture de stock.',
      'product',
      v_product.id,
      'critical'
    );
  elsif v_product.stock_quantity <= v_product.minimum_stock then
    perform public.resolve_notification_alerts(v_product.business_id, 'out_of_stock', v_product.id);
    perform public.create_in_app_notification(
      v_product.business_id,
      'low_stock',
      'Stock faible',
      'Le produit "' || v_product.name || '" ne dispose plus que de ' ||
        trim(to_char(v_product.stock_quantity, 'FM999999990.###')) || ' unités.',
      'product',
      v_product.id,
      'medium'
    );
  else
    perform public.resolve_notification_alerts(v_product.business_id, 'low_stock', v_product.id);
    perform public.resolve_notification_alerts(v_product.business_id, 'out_of_stock', v_product.id);
  end if;
end;
$$;

create or replace function public.create_customer_debt_alert(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers;
  v_due numeric;
  v_threshold numeric;
  v_age integer;
begin
  select * into v_customer from public.customers where id = p_customer_id;

  if not found then
    return;
  end if;

  if not public.is_business_member(v_customer.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  select coalesce(sum(s.amount_due), 0)
  into v_due
  from public.sales as s
  where s.business_id = v_customer.business_id
    and s.customer_id = v_customer.id
    and s.status = 'completed'
    and s.amount_due > 0;

  select customer_debt_alert_threshold
  into v_threshold
  from public.businesses
  where id = v_customer.business_id;

  select coalesce(max(
    (timezone('Africa/Dakar', now()))::date
    - (s.created_at at time zone 'Africa/Dakar')::date
  ), 0)
  into v_age
  from public.sales as s
  where s.business_id = v_customer.business_id
    and s.customer_id = v_customer.id
    and s.status = 'completed'
    and s.amount_due > 0;

  if v_due <= 0 then
    perform public.resolve_notification_alerts(v_customer.business_id, 'customer_debt', v_customer.id);
    perform public.resolve_notification_alerts(v_customer.business_id, 'old_customer_debt', v_customer.id);
    return;
  end if;

  if v_due >= coalesce(v_threshold, 100000) then
    perform public.create_in_app_notification(
      v_customer.business_id,
      'customer_debt',
      'Dette client',
      v_customer.name || ' doit ' || public.format_fcfa_amount(v_due) || '.',
      'customer',
      v_customer.id,
      'high'
    );
  else
    perform public.resolve_notification_alerts(v_customer.business_id, 'customer_debt', v_customer.id);
  end if;

  if v_age >= 30 then
    perform public.create_in_app_notification(
      v_customer.business_id,
      'old_customer_debt',
      'Dette ancienne',
      'La dette de ' || v_customer.name || ' est impayée depuis ' || v_age || ' jours.',
      'customer',
      v_customer.id,
      'high'
    );
  elsif v_age < 7 then
    perform public.resolve_notification_alerts(v_customer.business_id, 'old_customer_debt', v_customer.id);
  end if;
end;
$$;

create or replace function public.create_supplier_debt_alert(p_supplier_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supplier public.suppliers;
  v_due numeric;
  v_age integer;
begin
  select * into v_supplier from public.suppliers where id = p_supplier_id;

  if not found then
    return;
  end if;

  if not public.is_business_member(v_supplier.business_id) then
    raise exception 'FORBIDDEN';
  end if;

  select coalesce(sum(p.amount_due), 0)
  into v_due
  from public.purchases as p
  where p.business_id = v_supplier.business_id
    and p.supplier_id = v_supplier.id
    and p.status = 'completed'
    and p.amount_due > 0;

  select coalesce(max(
    (timezone('Africa/Dakar', now()))::date
    - p.purchase_date
  ), 0)
  into v_age
  from public.purchases as p
  where p.business_id = v_supplier.business_id
    and p.supplier_id = v_supplier.id
    and p.status = 'completed'
    and p.amount_due > 0;

  if v_due <= 0 then
    perform public.resolve_notification_alerts(v_supplier.business_id, 'supplier_debt', v_supplier.id);
    return;
  end if;

  if v_age >= 7 then
    perform public.create_in_app_notification(
      v_supplier.business_id,
      'supplier_debt',
      'Dette fournisseur',
      'Vous devez ' || public.format_fcfa_amount(v_due) || ' au fournisseur ' || v_supplier.name || '.',
      'supplier',
      v_supplier.id,
      'high'
    );
  end if;
end;
$$;

create or replace function public.notify_sale_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from 'completed' then
    return new;
  end if;

  perform public.create_in_app_notification(
    new.business_id,
    'sale_completed',
    'Vente enregistrée',
    'Vente ' || new.sale_number || ' de ' || public.format_fcfa_amount(new.total) || '.',
    'sale',
    new.id,
    'low'
  );

  if new.amount_paid > 0 and new.customer_id is not null then
    perform public.create_in_app_notification(
      new.business_id,
      'payment_received',
      'Paiement reçu',
      coalesce((select name from public.customers where id = new.customer_id), 'Un client')
        || ' a payé ' || public.format_fcfa_amount(new.amount_paid) || '.',
      'sale',
      new.id,
      'medium'
    );
  end if;

  if new.customer_id is not null then
    perform public.create_customer_debt_alert(new.customer_id);
  end if;

  return new;
end;
$$;

create or replace function public.notify_purchase_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from 'completed' then
    return new;
  end if;

  perform public.create_in_app_notification(
    new.business_id,
    'purchase_completed',
    'Achat enregistré',
    'Achat ' || new.purchase_number || ' de ' || public.format_fcfa_amount(new.total) || ' enregistré.',
    'purchase',
    new.id,
    'medium'
  );

  if new.supplier_id is not null then
    perform public.create_supplier_debt_alert(new.supplier_id);
  end if;

  return new;
end;
$$;

create or replace function public.notify_product_stock_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and new.stock_quantity is not distinct from old.stock_quantity
    and new.minimum_stock is not distinct from old.minimum_stock
    and new.is_active is not distinct from old.is_active
  then
    return new;
  end if;

  perform public.create_stock_alert(new.id);
  return new;
end;
$$;

create trigger sales_notify_created
  after insert on public.sales
  for each row execute procedure public.notify_sale_created();

create trigger purchases_notify_created
  after insert on public.purchases
  for each row execute procedure public.notify_purchase_created();

create trigger products_notify_stock
  after update of stock_quantity, minimum_stock, is_active on public.products
  for each row execute procedure public.notify_product_stock_changed();

create or replace function public.sync_business_alerts()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_product record;
  v_customer record;
  v_supplier record;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  for v_product in
    select id from public.products
    where business_id = v_business_id
      and is_active = true
  loop
    perform public.create_stock_alert(v_product.id);
  end loop;

  for v_customer in
    select distinct s.customer_id as id
    from public.sales as s
    where s.business_id = v_business_id
      and s.status = 'completed'
      and s.customer_id is not null
      and s.amount_due > 0
  loop
    perform public.create_customer_debt_alert(v_customer.id);
  end loop;

  for v_supplier in
    select distinct p.supplier_id as id
    from public.purchases as p
    where p.business_id = v_business_id
      and p.status = 'completed'
      and p.supplier_id is not null
      and p.amount_due > 0
  loop
    perform public.create_supplier_debt_alert(v_supplier.id);
  end loop;
end;
$$;

create or replace function public.cleanup_old_notifications(p_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  if p_days is null or p_days < 1 then
    p_days := 90;
  end if;

  delete from public.notifications
  where created_at < now() - make_interval(days => p_days)
    and is_read = true
    and (
      is_resolved = true
      or priority in ('low', 'medium')
    );

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

create or replace function public.update_notification_settings(
  p_low_stock boolean default null,
  p_out_of_stock boolean default null,
  p_customer_debt boolean default null,
  p_old_customer_debt boolean default null,
  p_supplier_debt boolean default null,
  p_sale_completed boolean default null,
  p_purchase_completed boolean default null,
  p_payment_received boolean default null
)
returns public.notification_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_user_id uuid := auth.uid();
  v_row public.notification_settings;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  v_row := public.ensure_notification_settings(v_business_id, v_user_id);

  update public.notification_settings
  set
    low_stock = coalesce(p_low_stock, low_stock),
    out_of_stock = coalesce(p_out_of_stock, out_of_stock),
    customer_debt = coalesce(p_customer_debt, customer_debt),
    old_customer_debt = coalesce(p_old_customer_debt, old_customer_debt),
    supplier_debt = coalesce(p_supplier_debt, supplier_debt),
    sale_completed = coalesce(p_sale_completed, sale_completed),
    purchase_completed = coalesce(p_purchase_completed, purchase_completed),
    payment_received = coalesce(p_payment_received, payment_received)
  where id = v_row.id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.update_customer_debt_alert_threshold(p_threshold numeric)
returns numeric
language plpgsql
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

  if public.current_member_role() not in ('owner', 'manager') then
    raise exception 'FORBIDDEN';
  end if;

  if p_threshold is null or p_threshold < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  update public.businesses
  set customer_debt_alert_threshold = p_threshold
  where id = v_business_id;

  return p_threshold;
end;
$$;

alter table public.notifications enable row level security;
alter table public.notifications force row level security;
alter table public.notification_settings enable row level security;
alter table public.notification_settings force row level security;

create policy "notifications_select_own"
  on public.notifications
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and public.is_business_member(business_id)
    and business_id = public.current_business_id()
  );

create policy "notifications_update_own"
  on public.notifications
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and public.is_business_member(business_id)
    and business_id = public.current_business_id()
  )
  with check (
    user_id = auth.uid()
    and public.is_business_member(business_id)
    and business_id = public.current_business_id()
  );

create policy "notifications_delete_own"
  on public.notifications
  for delete
  to authenticated
  using (
    user_id = auth.uid()
    and public.is_business_member(business_id)
    and business_id = public.current_business_id()
  );

create policy "notification_settings_own"
  on public.notification_settings
  for all
  to authenticated
  using (
    user_id = auth.uid()
    and public.is_business_member(business_id)
  )
  with check (
    user_id = auth.uid()
    and public.is_business_member(business_id)
    and business_id = public.current_business_id()
  );

grant select, update, delete on table public.notifications to authenticated;
grant select, insert, update on table public.notification_settings to authenticated;

revoke all on function public.format_fcfa_amount(numeric) from public;
revoke all on function public.notification_priority_for(text) from public;
revoke all on function public.notification_role_allowed(text, text) from public;
revoke all on function public.ensure_notification_settings(uuid, uuid) from public;
revoke all on function public.setting_enabled_for(public.notification_settings, text) from public;
revoke all on function public.resolve_notification_alerts(uuid, text, uuid) from public;
revoke all on function public.create_in_app_notification(uuid, text, text, text, text, uuid, text) from public;
revoke all on function public.create_stock_alert(uuid) from public;
revoke all on function public.create_customer_debt_alert(uuid) from public;
revoke all on function public.create_supplier_debt_alert(uuid) from public;
revoke all on function public.sync_business_alerts() from public;
revoke all on function public.cleanup_old_notifications(integer) from public;
revoke all on function public.update_notification_settings(boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) from public;
revoke all on function public.update_customer_debt_alert_threshold(numeric) from public;

grant execute on function public.create_in_app_notification(uuid, text, text, text, text, uuid, text) to authenticated;
grant execute on function public.sync_business_alerts() to authenticated;
grant execute on function public.create_stock_alert(uuid) to authenticated;
grant execute on function public.create_customer_debt_alert(uuid) to authenticated;
grant execute on function public.create_supplier_debt_alert(uuid) to authenticated;
grant execute on function public.cleanup_old_notifications(integer) to authenticated;
grant execute on function public.update_notification_settings(boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean) to authenticated;
grant execute on function public.update_customer_debt_alert_threshold(numeric) to authenticated;
grant execute on function public.ensure_notification_settings(uuid, uuid) to authenticated;
