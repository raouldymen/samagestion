-- Quotas plus larges pour Free et Pro.
update public.subscription_plan_features as f
set limit_value = 300
from public.subscription_plans as p
where f.plan_id = p.id
  and p.slug = 'free'
  and f.feature_key in ('products', 'sales_monthly', 'customers');

update public.subscription_plan_features as f
set limit_value = 5000
from public.subscription_plans as p
where f.plan_id = p.id
  and p.slug = 'pro'
  and f.feature_key = 'products';

update public.subscription_plan_features as f
set limit_value = 10
from public.subscription_plans as p
where f.plan_id = p.id
  and p.slug = 'pro'
  and f.feature_key = 'team_members';
