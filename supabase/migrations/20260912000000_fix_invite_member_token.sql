-- Invitation : gen_random_bytes n'est pas dans search_path = public (pgcrypto est dans extensions).
-- Conséquence : invite_business_member / resend_invitation échouaient à l'insert.

create or replace function public.new_invitation_token()
returns text
language sql
volatile
as $$
  select replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
$$;

create or replace function public.invite_business_member(p_email text, p_role text)
returns public.business_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_user_id uuid := auth.uid();
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_invite public.business_invitations;
  v_existing uuid;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;
  if not public.has_permission('team.invite', v_business_id) then
    raise exception 'FORBIDDEN';
  end if;
  if v_email = '' or v_email !~ '^[^@]+@[^@]+\.[^@]+$' then
    raise exception 'INVALID_EMAIL';
  end if;
  if p_role not in ('manager', 'cashier', 'seller', 'stock_manager') then
    raise exception 'INVALID_ROLE';
  end if;
  if not public.has_plan_feature('team_management', v_business_id) then
    raise exception 'FEATURE_NOT_AVAILABLE:team_management';
  end if;

  perform public.assert_plan_limit('team_members', v_business_id);

  select u.id into v_existing
  from auth.users as u
  where lower(u.email) = v_email
  limit 1;

  if v_existing is not null and exists (
    select 1 from public.business_members
    where business_id = v_business_id and user_id = v_existing and status = 'active'
  ) then
    raise exception 'ALREADY_MEMBER';
  end if;

  update public.business_invitations
  set status = 'cancelled'
  where business_id = v_business_id
    and lower(email) = v_email
    and status = 'pending';

  insert into public.business_invitations (
    business_id, email, role, token, status, expires_at, invited_by
  )
  values (
    v_business_id,
    v_email,
    p_role,
    public.new_invitation_token(),
    'pending',
    now() + interval '7 days',
    v_user_id
  )
  returning * into v_invite;

  perform public.write_audit_log(
    'member.invited',
    'invitation',
    v_invite.id,
    jsonb_build_object('email', v_email, 'role', p_role),
    v_business_id,
    v_user_id
  );

  return v_invite;
end;
$$;

create or replace function public.resend_invitation(p_invitation_id uuid)
returns public.business_invitations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_invite public.business_invitations;
begin
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;
  if not public.has_permission('team.invite', v_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_invite
  from public.business_invitations
  where id = p_invitation_id
    and business_id = v_business_id;

  if not found then
    raise exception 'INVITATION_NOT_FOUND';
  end if;

  update public.business_invitations
  set
    token = public.new_invitation_token(),
    status = 'pending',
    expires_at = now() + interval '7 days'
  where id = v_invite.id
  returning * into v_invite;

  perform public.write_audit_log(
    'member.invited',
    'invitation',
    v_invite.id,
    jsonb_build_object('email', v_invite.email, 'resent', true),
    v_business_id,
    auth.uid()
  );

  return v_invite;
end;
$$;

drop policy if exists invitations_member_insert on public.business_invitations;
create policy invitations_member_insert
  on public.business_invitations
  for insert
  to authenticated
  with check (
    public.is_business_member(business_id)
    and public.has_permission('team.invite', business_id)
  );

drop policy if exists invitations_member_update on public.business_invitations;
create policy invitations_member_update
  on public.business_invitations
  for update
  to authenticated
  using (
    public.is_business_member(business_id)
    and public.has_permission('team.invite', business_id)
  )
  with check (
    public.is_business_member(business_id)
    and public.has_permission('team.invite', business_id)
  );

grant execute on function public.new_invitation_token() to authenticated;
grant execute on function public.invite_business_member(text, text) to authenticated;
grant execute on function public.resend_invitation(uuid) to authenticated;
