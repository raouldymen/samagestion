-- Retourne les adresses e-mail des membres à la page Équipe.
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
  if not public.has_permission('team.view', v_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    m.id,
    m.user_id,
    coalesce(p.full_name, split_part(u.email, '@', 1), 'Membre'),
    u.email::text,
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
    and m.status in ('active', 'invited', 'suspended')
  order by
    case m.role when 'owner' then 0 when 'manager' then 1 else 2 end,
    m.created_at;
end;
$$;

revoke all on function public.list_team_members() from public;
grant execute on function public.list_team_members() to authenticated;
