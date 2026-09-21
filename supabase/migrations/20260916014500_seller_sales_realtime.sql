-- Les vendeurs voient sans rechargement manuel le passage d'une vente de « En attente » à « Payée ».
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sales'
  ) then
    alter publication supabase_realtime add table public.sales;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cashier_sale_queue'
  ) then
    alter publication supabase_realtime add table public.cashier_sale_queue;
  end if;
end;
$$;
