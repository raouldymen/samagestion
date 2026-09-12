-- Ajout direct d'un membre (compte créé côté app avec mot de passe).
-- Après connexion, current_business_id privilégie la boutique qui l'a ajouté.

alter table public.profiles
  add column if not exists current_business_id uuid references public.businesses (id) on delete set null;

create index if not exists profiles_current_business_id_idx
  on public.profiles (current_business_id);

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.current_business_id
      from public.profiles as p
      inner join public.business_members as m
        on m.user_id = p.id
       and m.business_id = p.current_business_id
      where p.id = auth.uid()
        and m.status = 'active'
      limit 1
    ),
    (
      select m.business_id
      from public.business_members as m
      where m.user_id = auth.uid()
        and m.status = 'active'
      order by m.created_at asc
      limit 1
    )
  );
$$;

create or replace function public.add_business_member_direct(p_user_id uuid, p_role text)
returns public.business_members
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_actor uuid := auth.uid();
  v_email text;
  v_member public.business_members;
begin
  if v_actor is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;
  if p_user_id is null then
    raise exception 'MEMBER_NOT_FOUND';
  end if;
  if not public.has_permission('team.invite', v_business_id) then
    raise exception 'FORBIDDEN';
  end if;
  if p_role not in ('manager', 'cashier', 'seller', 'stock_manager') then
    raise exception 'INVALID_ROLE';
  end if;
  if not public.has_plan_feature('team_management', v_business_id) then
    raise exception 'FEATURE_NOT_AVAILABLE:team_management';
  end if;

  select lower(u.email) into v_email
  from auth.users as u
  where u.id = p_user_id;

  if v_email is null then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.business_members
    where business_id = v_business_id
      and user_id = p_user_id
      and status = 'active'
  ) then
    raise exception 'ALREADY_MEMBER';
  end if;

  update public.business_invitations
  set status = 'cancelled'
  where business_id = v_business_id
    and lower(email) = v_email
    and status = 'pending';

  perform public.assert_plan_limit('team_members', v_business_id);

  insert into public.business_members (business_id, user_id, role, status)
  values (v_business_id, p_user_id, p_role, 'active')
  on conflict (business_id, user_id) do update
    set role = excluded.role,
        status = 'active'
  returning * into v_member;

  update public.profiles
  set current_business_id = v_business_id
  where id = p_user_id;

  perform public.write_audit_log(
    'member.invited',
    'member',
    v_member.id,
    jsonb_build_object('email', v_email, 'role', p_role, 'direct', true),
    v_business_id,
    v_actor
  );

  return v_member;
end;
$$;

revoke all on function public.add_business_member_direct(uuid, text) from public;
grant execute on function public.add_business_member_direct(uuid, text) to authenticated;
