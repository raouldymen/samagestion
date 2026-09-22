-- Le propriétaire peut supprimer définitivement son commerce (cascade métier).
create or replace function public.delete_own_business()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_owner_id uuid;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  if public.current_member_role() is distinct from 'owner' then
    raise exception 'FORBIDDEN';
  end if;

  select owner_id into v_owner_id
  from public.businesses
  where id = v_business_id;

  if not found then
    raise exception 'NO_BUSINESS';
  end if;

  if v_owner_id is not null and v_owner_id <> auth.uid() then
    raise exception 'FORBIDDEN';
  end if;

  delete from public.businesses where id = v_business_id;
end;
$$;

revoke all on function public.delete_own_business() from public;
grant execute on function public.delete_own_business() to authenticated;
