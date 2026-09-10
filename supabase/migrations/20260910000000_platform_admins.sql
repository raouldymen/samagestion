-- Administrateurs de plateforme : rôle global séparé des rôles d'un commerce.
-- Une entrée doit être créée exclusivement depuis le serveur avec le service_role.

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  notes text
);

alter table public.platform_admins enable row level security;

-- Aucune policy : la table elle-même reste inaccessible à authenticated.
-- Ne pas utiliser FORCE ici : is_platform_admin() doit pouvoir lire l'allowlist
-- avec les droits de son propriétaire security definer.

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins
    where user_id = auth.uid()
  );
$$;

revoke all on table public.platform_admins from public;
revoke all on table public.platform_admins from authenticated;
revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

comment on table public.platform_admins is
  'Allowlist des administrateurs de la plateforme. À gérer uniquement par service_role.';

grant all on table public.platform_admins to service_role;
grant execute on function public.is_platform_admin() to service_role;
