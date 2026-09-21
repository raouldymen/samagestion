-- Les profils qui peuvent saisir une dépense (notamment la caisse) doivent
-- pouvoir consulter les catégories, sans obtenir le droit de les gérer.
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

  if not public.has_permission('expenses.create', v_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  -- Création idempotente, y compris pour les commerces déjà existants.
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

revoke all on function public.list_expense_categories() from public;
grant execute on function public.list_expense_categories() to authenticated;
