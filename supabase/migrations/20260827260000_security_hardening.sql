-- Audit sécurité : corrections CRITIQUE / HAUTE / certaines MOYENNES

alter table public.payment_settings
  add column if not exists mock_payments_enabled boolean not null default false;

comment on column public.payment_settings.mock_payments_enabled is
  'Si true, autorise checkout mock + confirm_mock (dev uniquement). Toujours false en production.';

-- Activer le mock UNIQUEMENT si déjà en phase de test locale (à désactiver avant prod)
-- Laisser false par défaut. Le simulate Next.js pourra l'activer via service role si besoin.

create or replace function public.member_role_for(p_business_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.business_members
  where user_id = auth.uid()
    and business_id = p_business_id
    and status = 'active'
  limit 1
$$;

-- 2-arg : permission liée au commerce de la ligne (anti cross-tenant)
create or replace function public.has_permission(p_permission text, p_business_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if auth.uid() is null or p_business_id is null then
    return false;
  end if;

  if not public.is_business_member(p_business_id) then
    return false;
  end if;

  v_role := public.member_role_for(p_business_id);
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

-- 1-arg : délègue au commerce courant (compatibilité RPC existantes)
create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_permission(p_permission, public.current_business_id());
$$;

drop policy if exists "categories_member_all" on public.categories;
create policy "categories_member_all"
  on public.categories for all to authenticated
  using (public.is_business_member(business_id) and public.has_permission('products.view', business_id))
  with check (public.is_business_member(business_id) and public.has_permission('products.edit', business_id));

drop policy if exists "products_member_select" on public.products;
create policy "products_member_select"
  on public.products for select to authenticated
  using (public.is_business_member(business_id) and public.has_permission('products.view', business_id));

drop policy if exists "products_member_update" on public.products;
create policy "products_member_update"
  on public.products for update to authenticated
  using (public.is_business_member(business_id) and public.has_permission('products.edit', business_id))
  with check (public.is_business_member(business_id) and public.has_permission('products.edit', business_id));

drop policy if exists "stock_movements_member_select" on public.stock_movements;
create policy "stock_movements_member_select"
  on public.stock_movements for select to authenticated
  using (public.is_business_member(business_id) and public.has_permission('stock.view', business_id));

drop policy if exists "customers_member_select" on public.customers;
create policy "customers_member_select"
  on public.customers for select to authenticated
  using (public.is_business_member(business_id) and public.has_permission('customers.view', business_id));

drop policy if exists "sales_member_select" on public.sales;
create policy "sales_member_select"
  on public.sales for select to authenticated
  using (
    public.is_business_member(business_id)
    and public.has_permission('sales.view', business_id)
    and (public.has_permission('sales.list_all', business_id) or user_id = auth.uid())
  );

drop policy if exists "sale_items_member_select" on public.sale_items;
create policy "sale_items_member_select"
  on public.sale_items for select to authenticated
  using (
    exists (
      select 1 from public.sales as s
      where s.id = sale_items.sale_id
        and public.is_business_member(s.business_id)
        and public.has_permission('sales.view', s.business_id)
        and (public.has_permission('sales.list_all', s.business_id) or s.user_id = auth.uid())
    )
  );

drop policy if exists "expenses_member_select" on public.expenses;
create policy "expenses_member_select"
  on public.expenses for select to authenticated
  using (public.is_business_member(business_id) and public.has_permission('expenses.view', business_id));

drop policy if exists "expense_categories_member_select" on public.expense_categories;
create policy "expense_categories_member_select"
  on public.expense_categories for select to authenticated
  using (public.is_business_member(business_id) and public.has_permission('expenses.view', business_id));

drop policy if exists "purchases_member_select" on public.purchases;
create policy "purchases_member_select"
  on public.purchases for select to authenticated
  using (public.is_business_member(business_id) and public.has_permission('purchases.view', business_id));

drop policy if exists "purchase_items_member_select" on public.purchase_items;
create policy "purchase_items_member_select"
  on public.purchase_items for select to authenticated
  using (
    exists (
      select 1 from public.purchases as p
      where p.id = purchase_items.purchase_id
        and public.is_business_member(p.business_id)
        and public.has_permission('purchases.view', p.business_id)
    )
  );

drop policy if exists "suppliers_member_select" on public.suppliers;
create policy "suppliers_member_select"
  on public.suppliers for select to authenticated
  using (public.is_business_member(business_id) and public.has_permission('suppliers.view', business_id));

drop policy if exists "business_settings_member_select" on public.business_settings;
create policy "business_settings_member_select"
  on public.business_settings for select to authenticated
  using (public.is_business_member(business_id) and public.has_permission('settings.view', business_id));

drop policy if exists "business_subscriptions_member_select" on public.business_subscriptions;
create policy "business_subscriptions_member_select"
  on public.business_subscriptions for select to authenticated
  using (public.is_business_member(business_id) and public.has_permission('settings.view', business_id));

drop policy if exists "subscription_transactions_member_select" on public.subscription_transactions;
create policy "subscription_transactions_member_select"
  on public.subscription_transactions for select to authenticated
  using (public.is_business_member(business_id) and public.has_permission('settings.view', business_id));

drop policy if exists "invitations_member_select" on public.business_invitations;
create policy "invitations_member_select"
  on public.business_invitations for select to authenticated
  using (public.is_business_member(business_id) and public.has_permission('team.view', business_id));

drop policy if exists "audit_logs_member_select" on public.audit_logs;
create policy "audit_logs_member_select"
  on public.audit_logs for select to authenticated
  using (public.is_business_member(business_id) and public.has_permission('team.view', business_id));

revoke update on table public.categories from authenticated;
grant update (name, updated_at) on table public.categories to authenticated;

create or replace function public.has_plan_feature(p_feature text, p_business_id uuid default null)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_id uuid := coalesce(p_business_id, public.current_business_id());
  v_plan_id uuid;
  v_enabled boolean;
begin
  if v_business_id is null then return false; end if;
  if auth.uid() is not null and not public.is_business_member(v_business_id) then return false; end if;
  v_plan_id := public.get_effective_plan_id(v_business_id);
  select enabled into v_enabled from public.subscription_plan_features
  where plan_id = v_plan_id and feature_key = p_feature limit 1;
  return coalesce(v_enabled, false);
end;
$$;

create or replace function public.get_plan_limit(p_feature text, p_business_id uuid default null)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_id uuid := coalesce(p_business_id, public.current_business_id());
  v_plan_id uuid;
  v_limit integer;
  v_enabled boolean;
begin
  if v_business_id is null then return 0; end if;
  if auth.uid() is not null and not public.is_business_member(v_business_id) then return 0; end if;
  v_plan_id := public.get_effective_plan_id(v_business_id);
  select enabled, limit_value into v_enabled, v_limit from public.subscription_plan_features
  where plan_id = v_plan_id and feature_key = p_feature limit 1;
  if not coalesce(v_enabled, false) then return 0; end if;
  return v_limit;
end;
$$;

create or replace function public.count_plan_usage(p_feature text, p_business_id uuid default null)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_business_id uuid := coalesce(p_business_id, public.current_business_id());
  v_count integer := 0;
  v_from timestamptz;
  v_to timestamptz;
begin
  if v_business_id is null then return 0; end if;
  if auth.uid() is not null and not public.is_business_member(v_business_id) then return 0; end if;

  if p_feature = 'products' then
    select count(*)::integer into v_count from public.products where business_id = v_business_id and is_active = true;
  elsif p_feature = 'customers' then
    select count(*)::integer into v_count from public.customers where business_id = v_business_id and is_active = true;
  elsif p_feature = 'team_members' then
    select (
      (select count(*) from public.business_members where business_id = v_business_id and status in ('active', 'invited'))
      + (select count(*) from public.business_invitations where business_id = v_business_id and status = 'pending' and expires_at >= now())
    )::integer into v_count;
  elsif p_feature = 'sales_monthly' then
    v_from := timezone('Africa/Dakar', date_trunc('month', timezone('Africa/Dakar', now())));
    v_to := timezone('Africa/Dakar', date_trunc('month', timezone('Africa/Dakar', now())) + interval '1 month');
    select count(*)::integer into v_count from public.sales
    where business_id = v_business_id and status = 'completed' and created_at >= v_from and created_at < v_to;
  else
    v_count := 0;
  end if;
  return coalesce(v_count, 0);
end;
$$;

create or replace function public.create_payment_checkout(p_plan_id uuid, p_environment text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_business_id uuid := public.current_business_id();
  v_plan public.subscription_plans;
  v_sub public.business_subscriptions;
  v_ref text;
  v_mock boolean;
  v_env text;
  v_tx public.subscription_transactions;
begin
  if v_user_id is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_business_id is null then raise exception 'NO_BUSINESS'; end if;
  if not public.has_permission('settings.edit', v_business_id) then raise exception 'FORBIDDEN'; end if;

  select coalesce(mock_payments_enabled, false) into v_mock from public.payment_settings where id = 1;
  v_mock := coalesce(v_mock, false);
  v_env := case when v_mock then 'test' else 'production' end;

  select * into v_plan from public.subscription_plans where id = p_plan_id and is_active = true;
  if not found then raise exception 'PLAN_NOT_FOUND'; end if;
  if v_plan.slug = 'free' or v_plan.price_monthly <= 0 then raise exception 'PLAN_NOT_PAYABLE'; end if;
  if upper(v_plan.currency) <> 'XOF' then raise exception 'UNSUPPORTED_CURRENCY'; end if;

  v_sub := public.ensure_business_subscription(v_business_id);
  v_ref := public.generate_payment_reference();

  insert into public.subscription_transactions (
    business_id, subscription_id, plan_id, provider, provider_transaction_id,
    internal_reference, amount, currency, status, environment, initiated_by, metadata
  ) values (
    v_business_id, v_sub.id, v_plan.id, 'pending', v_ref, v_ref,
    v_plan.price_monthly, v_plan.currency, 'pending', v_env, v_user_id,
    jsonb_build_object('plan_slug', v_plan.slug, 'plan_name', v_plan.name, 'business_id', v_business_id)
  ) returning * into v_tx;

  return jsonb_build_object(
    'transaction_id', v_tx.id, 'internal_reference', v_tx.internal_reference,
    'amount', v_tx.amount, 'currency', v_tx.currency, 'plan_id', v_plan.id,
    'plan_slug', v_plan.slug, 'plan_name', v_plan.name, 'business_id', v_business_id,
    'environment', v_tx.environment, 'status', v_tx.status, 'mock_enabled', v_mock
  );
end;
$$;

create or replace function public.confirm_mock_test_payment(p_internal_reference text, p_success boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tx public.subscription_transactions;
  v_mock boolean;
  v_result jsonb;
begin
  select coalesce(mock_payments_enabled, false) into v_mock from public.payment_settings where id = 1;
  if not coalesce(v_mock, false) then raise exception 'MOCK_PAYMENTS_DISABLED'; end if;

  select * into v_tx from public.subscription_transactions
  where internal_reference = btrim(p_internal_reference) for update;
  if not found then raise exception 'TRANSACTION_NOT_FOUND'; end if;
  if v_tx.environment <> 'test' then raise exception 'MOCK_ONLY_IN_TEST'; end if;
  if v_tx.provider not in ('mock', 'pending') then raise exception 'NOT_A_MOCK_TRANSACTION'; end if;

  v_result := public.confirm_subscription_payment(
    v_tx.internal_reference, 'mock',
    coalesce(v_tx.provider_transaction_id, 'mock_' || v_tx.internal_reference),
    v_tx.amount, v_tx.currency,
    case when p_success then 'successful' else 'failed' end,
    case when p_success then 'payment.success' else 'payment.failed' end,
    'test', jsonb_build_object('source', 'mock_service_role')
  );
  return v_result;
end;
$$;

revoke all on function public.confirm_mock_test_payment(text, boolean) from public;
revoke all on function public.confirm_mock_test_payment(text, boolean) from authenticated;
grant execute on function public.confirm_mock_test_payment(text, boolean) to service_role;

revoke all on function public.record_subscription_transaction(text, text, numeric, text, uuid, jsonb) from public;
revoke all on function public.record_subscription_transaction(text, text, numeric, text, uuid, jsonb) from authenticated;
grant execute on function public.record_subscription_transaction(text, text, numeric, text, uuid, jsonb) to service_role;

revoke all on function public.expire_stale_subscriptions() from public;
revoke all on function public.expire_stale_subscriptions() from authenticated;
grant execute on function public.expire_stale_subscriptions() to service_role;

revoke all on function public.confirm_subscription_payment(text, text, text, numeric, text, text, text, text, jsonb) from public;
revoke all on function public.confirm_subscription_payment(text, text, text, numeric, text, text, text, text, jsonb) from authenticated;
grant execute on function public.confirm_subscription_payment(text, text, text, numeric, text, text, text, text, jsonb) to service_role;

revoke all on function public.renew_subscription_period(uuid, text, text, numeric, text, text, jsonb) from public;
revoke all on function public.renew_subscription_period(uuid, text, text, numeric, text, text, jsonb) from authenticated;
grant execute on function public.renew_subscription_period(uuid, text, text, numeric, text, text, jsonb) to service_role;

create or replace function public.cleanup_old_notifications(p_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_deleted integer;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if v_business_id is null then raise exception 'NO_BUSINESS'; end if;
  if not public.has_permission('settings.edit', v_business_id) then raise exception 'FORBIDDEN'; end if;
  if p_days is null or p_days < 1 then p_days := 90; end if;

  delete from public.notifications
  where business_id = v_business_id
    and created_at < now() - make_interval(days => p_days)
    and is_read = true
    and (is_resolved = true or priority in ('low', 'medium'));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.create_in_app_notification(uuid, text, text, text, text, uuid, text) from public;
revoke all on function public.create_in_app_notification(uuid, text, text, text, text, uuid, text) from authenticated;

-- Storage product-images (privé, isolation par dossier business_id)
drop policy if exists "product_images_insert_member" on storage.objects;
create policy "product_images_insert_member" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-images'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
    and public.has_permission('products.edit', ((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "product_images_update_member" on storage.objects;
create policy "product_images_update_member" on storage.objects for update to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
    and public.has_permission('products.edit', ((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'product-images'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
    and public.has_permission('products.edit', ((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "product_images_delete_member" on storage.objects;
create policy "product_images_delete_member" on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-images'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
    and public.has_permission('products.edit', ((storage.foldername(name))[1])::uuid)
  );

create or replace function public.set_mock_payments_enabled(p_enabled boolean)
returns public.payment_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.payment_settings;
begin
  -- Uniquement service_role (pas de grant authenticated)
  insert into public.payment_settings (id, mock_payments_enabled, updated_at)
  values (1, coalesce(p_enabled, false), now())
  on conflict (id) do update
    set mock_payments_enabled = excluded.mock_payments_enabled, updated_at = now()
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.set_mock_payments_enabled(boolean) from public;
revoke all on function public.set_mock_payments_enabled(boolean) from authenticated;
grant execute on function public.set_mock_payments_enabled(boolean) to service_role;

grant execute on function public.member_role_for(uuid) to authenticated;
grant execute on function public.has_permission(text, uuid) to authenticated;
grant execute on function public.has_permission(text) to authenticated;


-- ---------------------------------------------------------------------------
-- apply_stock_change : gate aussi les retours manuels
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

  if p_type in ('adjustment', 'loss', 'return') and not public.has_permission('stock.adjust') then
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

  -- Vérifier la permission sur le commerce du produit (anti cross-tenant)
  if p_type in ('adjustment', 'loss', 'return') and not public.has_permission('stock.adjust', v_product.business_id) then
    raise exception 'FORBIDDEN';
  end if;
  if p_type = 'purchase' and not public.has_permission('purchases.create', v_product.business_id) then
    raise exception 'FORBIDDEN';
  end if;
  if p_type = 'sale' and not public.has_permission('sales.create', v_product.business_id) then
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

-- ---------------------------------------------------------------------------
-- change_business_plan : NE PLUS activer un plan payant sans paiement
-- Seul le downgrade vers free (ou reste sur free) est autorisé ici.
-- Les upgrades payants passent par create_payment_checkout + webhook.
-- ---------------------------------------------------------------------------
create or replace function public.change_business_plan(p_plan_slug text)
returns public.business_subscriptions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_plan public.subscription_plans;
  v_current public.business_subscriptions;
  v_new public.business_subscriptions;
  v_from text;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;
  if not public.has_permission('settings.edit', v_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_plan
  from public.subscription_plans
  where slug = p_plan_slug and is_active = true;

  if not found then
    raise exception 'PLAN_NOT_FOUND';
  end if;

  -- Bloquer toute activation gratuite d'un plan payant
  if v_plan.slug <> 'free' and coalesce(v_plan.price_monthly, 0) > 0 then
    raise exception 'PAYMENT_REQUIRED';
  end if;

  if v_plan.slug <> 'free' then
    raise exception 'PAYMENT_REQUIRED';
  end if;

  v_current := public.ensure_business_subscription(v_business_id);
  select slug into v_from from public.subscription_plans where id = v_current.plan_id;

  if v_current.plan_id = v_plan.id
     and v_current.status in ('active', 'trialing')
     and coalesce(v_current.cancel_at_period_end, false) = false then
    return v_current;
  end if;

  update public.business_subscriptions
  set status = 'expired',
      cancelled_at = coalesce(cancelled_at, now()),
      updated_at = now()
  where id = v_current.id
    and status in ('trialing', 'active', 'past_due', 'cancelled');

  insert into public.business_subscriptions (
    business_id, plan_id, status, started_at, current_period_start, current_period_end
  )
  values (v_business_id, v_plan.id, 'active', now(), now(), null)
  returning * into v_new;

  perform public.write_audit_log(
    'subscription.downgraded',
    'subscription',
    v_new.id,
    jsonb_build_object('from', v_from, 'to', v_plan.slug)
  );

  return v_new;
end;
$$;

-- Audit logs : lecture seule pour authenticated (pas d'insert/update/delete client)
revoke insert, update, delete on table public.audit_logs from authenticated;
revoke insert, update, delete on table public.business_subscriptions from authenticated;
revoke insert, update, delete on table public.subscription_transactions from authenticated;

-- business-logos : write lié à membership + settings.edit sur le dossier business
-- SELECT public par conception (logos affichés sur reçus / branding)
drop policy if exists "business_logos_insert_owner" on storage.objects;
create policy "business_logos_insert_owner" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'business-logos'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
    and public.has_permission('settings.edit', ((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "business_logos_update_owner" on storage.objects;
create policy "business_logos_update_owner" on storage.objects for update to authenticated
  using (
    bucket_id = 'business-logos'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
    and public.has_permission('settings.edit', ((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'business-logos'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
    and public.has_permission('settings.edit', ((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "business_logos_delete_owner" on storage.objects;
create policy "business_logos_delete_owner" on storage.objects for delete to authenticated
  using (
    bucket_id = 'business-logos'
    and public.is_business_member(((storage.foldername(name))[1])::uuid)
    and public.has_permission('settings.edit', ((storage.foldername(name))[1])::uuid)
  );

