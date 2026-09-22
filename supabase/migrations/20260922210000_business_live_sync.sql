-- Les membres voient les données partagées sans rechargement manuel.
do $$
declare
  table_name text;
  tables text[] := array[
    'products',
    'categories',
    'customers',
    'expenses',
    'expense_categories',
    'purchases',
    'suppliers',
    'notifications',
    'business_members',
    'sale_returns',
    'customer_debt_payments',
    'supplier_debt_payments',
    'stock_movements',
    'businesses',
    'business_invitations',
    'owner_sale_cashier_collections'
  ];
begin
  foreach table_name in array tables loop
    if to_regclass('public.' || table_name) is null then
      continue;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;

    execute format('alter table public.%I replica identity full', table_name);
  end loop;
end;
$$;
