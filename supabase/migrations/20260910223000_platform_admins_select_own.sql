-- is_platform_admin() est security definer, mais si le propriétaire
-- de la fonction est soumis au RLS, aucune policy = toujours false.
-- SELECT limité à sa propre ligne : l'utilisateur voit seulement s'il est admin.

drop policy if exists platform_admins_select_own on public.platform_admins;
create policy platform_admins_select_own
  on public.platform_admins
  for select
  to authenticated
  using (user_id = auth.uid());
