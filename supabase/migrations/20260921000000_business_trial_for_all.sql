-- Offre temporaire : Business gratuit pendant 60 jours pour toutes les boutiques.
create table if not exists public.subscription_promotions (
  id uuid primary key default gen_random_uuid(),
  plan_slug text not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

insert into public.subscription_promotions (plan_slug, ends_at)
select 'business', now() + interval '60 days'
where not exists (select 1 from public.subscription_promotions where plan_slug = 'business' and ends_at > now());

create or replace function public.apply_subscription_promotion()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_business uuid; v_promotion public.subscription_promotions;
begin
  select * into v_promotion from public.subscription_promotions where plan_slug = 'business' and ends_at > now() order by ends_at desc limit 1;
  if found and NEW.plan_id = public.get_free_plan_id() and NEW.status = 'active' then
    select id into v_business from public.subscription_plans where slug = 'business' and is_active = true limit 1;
    if v_business is not null then
      NEW.plan_id := v_business;
      NEW.status := 'trialing';
      NEW.trial_start := now();
      NEW.trial_end := v_promotion.ends_at;
      NEW.current_period_start := now();
      NEW.current_period_end := v_promotion.ends_at;
    end if;
  end if;
  return NEW;
end; $$;

drop trigger if exists business_subscriptions_apply_promotion on public.business_subscriptions;
create trigger business_subscriptions_apply_promotion before insert on public.business_subscriptions for each row execute function public.apply_subscription_promotion();

update public.business_subscriptions s
set plan_id = p.id, status = 'trialing', trial_start = now(), trial_end = promo.ends_at,
    current_period_start = now(), current_period_end = promo.ends_at, cancel_at_period_end = false, cancelled_at = null
from public.subscription_plans p, lateral (select ends_at from public.subscription_promotions where plan_slug='business' and ends_at > now() order by ends_at desc limit 1) promo
where p.slug = 'business' and p.is_active = true and s.status in ('trialing','active','past_due','cancelled');
