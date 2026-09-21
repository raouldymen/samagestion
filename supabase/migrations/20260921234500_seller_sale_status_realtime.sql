-- Le filtre Realtime sur seller_id / user_id exige les colonnes dans l'identité de réplication.
alter table public.cashier_sale_queue replica identity full;
alter table public.sales replica identity full;

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
