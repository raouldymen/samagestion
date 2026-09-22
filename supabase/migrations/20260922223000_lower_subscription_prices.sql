-- Nouveaux tarifs : Pro 2 500 FCFA, Business 5 000 FCFA.
update public.subscription_plans
set price_monthly = 2500
where slug = 'pro';

update public.subscription_plans
set price_monthly = 5000
where slug = 'business';
