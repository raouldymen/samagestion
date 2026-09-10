-- Supprime l'ancienne surcharge 1-arg (ambiguë avec la version business_id)
drop function if exists public.assert_plan_limit(text);

-- Version unique : business_id optionnel (défaut = current_business_id)
create or replace function public.assert_plan_limit(p_feature text, p_business_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := coalesce(p_business_id, public.current_business_id());
  v_limit integer;
  v_usage integer;
begin
  if v_business_id is null then
    raise exception 'NO_BUSINESS';
  end if;

  if auth.uid() is not null and not public.is_business_member(v_business_id) then
    raise exception 'FORBIDDEN';
  end if;

  v_limit := public.get_plan_limit(p_feature, v_business_id);

  if v_limit is null then
    return;
  end if;

  v_usage := public.count_plan_usage(p_feature, v_business_id);

  if v_usage >= v_limit then
    raise exception 'PLAN_LIMIT_REACHED:%:%:%', p_feature, v_usage, v_limit;
  end if;
end;
$$;

grant execute on function public.assert_plan_limit(text, uuid) to authenticated;
