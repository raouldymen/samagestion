-- Le caissier peut voir et choisir les catégories de dépenses, comme dans l'application.
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
      'expenses.view', 'expenses.create',
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

create or replace function public.list_expense_categories()
returns table (
  id uuid,
  business_id uuid,
  name text,
  created_at timestamptz
)
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

  if not (
    public.has_permission('expenses.create', v_business_id)
    or public.has_permission('expenses.view', v_business_id)
  ) then
    raise exception 'FORBIDDEN';
  end if;

  insert into public.expense_categories (business_id, name)
  select v_business_id, category_name
  from unnest(array[
    'Loyer',
    'Transport',
    'Électricité',
    'Internet',
    'Salaires',
    'Fournitures',
    'Entretien',
    'Marketing',
    'Taxes',
    'Autre'
  ]) as category_name
  on conflict do nothing;

  return query
  select c.id, c.business_id, c.name, c.created_at
  from public.expense_categories as c
  where c.business_id = v_business_id
  order by c.name;
end;
$$;
