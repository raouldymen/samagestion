-- RLS sans policy faisait échouer is_platform_admin() pour authenticated.
drop policy if exists platform_admins_select_own on public.platform_admins;
create policy platform_admins_select_own
  on public.platform_admins
  for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.is_platform_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1
    from public.platform_admins
    where user_id = auth.uid()
  );
end;
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.is_platform_admin() to service_role;

notify pgrst, 'reload schema';
