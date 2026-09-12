-- Connexion Google : le profil reprend le nom et la photo fournis par OAuth.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, avatar_url)
  values (
    new.id,
    nullif(btrim(coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      ''
    )), ''),
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'phone', '')), ''),
    nullif(btrim(coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture',
      ''
    )), '')
  )
  on conflict (id) do nothing;

  return new;
exception
  when others then
    raise warning 'SamaGestion: impossible de créer le profil % : %', new.id, sqlerrm;
    return new;
end;
$$;
