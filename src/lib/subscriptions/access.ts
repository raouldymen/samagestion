import { redirect } from "next/navigation";
import { getSubscriptionBundle } from "@/lib/subscriptions/queries";
import { checkPlanLimit, hasFeature } from "@/lib/subscriptions/limits";
import type { PlanFeatureKey, PlanSlug } from "@/types/subscriptions";
import type { SubscriptionBundle } from "@/types/subscriptions";

export async function requireFeature(feature: PlanFeatureKey): Promise<SubscriptionBundle> {
  const bundle = await getSubscriptionBundle();
  if (!hasFeature(bundle.features, feature)) {
    redirect(`/upgrade?feature=${feature}`);
  }
  return bundle;
}

export async function requirePlan(slug: PlanSlug | PlanSlug[]): Promise<SubscriptionBundle> {
  const bundle = await getSubscriptionBundle();
  const allowed = Array.isArray(slug) ? slug : [slug];
  if (!allowed.includes(bundle.plan.slug)) {
    redirect("/upgrade");
  }
  return bundle;
}

export async function requireLimit(feature: PlanFeatureKey): Promise<SubscriptionBundle> {
  const bundle = await getSubscriptionBundle();
  const usageMap: Record<string, number> = {
    products: bundle.usage.products,
    sales_monthly: bundle.usage.salesMonthly,
    customers: bundle.usage.customers,
    team_members: bundle.usage.teamMembers,
  };
  const result = checkPlanLimit(bundle.features, feature, usageMap[feature] ?? 0);
  if (!result.allowed) {
    redirect(`/upgrade?limit=${feature}`);
  }
  return bundle;
}

export async function assertFeature(feature: PlanFeatureKey) {
  const bundle = await getSubscriptionBundle();
  if (!hasFeature(bundle.features, feature)) {
    throw new Error(`FEATURE_NOT_AVAILABLE:${feature}`);
  }
  return bundle;
}

export async function assertLimit(feature: PlanFeatureKey) {
  const bundle = await getSubscriptionBundle();
  const usageMap: Record<string, number> = {
    products: bundle.usage.products,
    sales_monthly: bundle.usage.salesMonthly,
    customers: bundle.usage.customers,
    team_members: bundle.usage.teamMembers,
  };
  const usage = usageMap[feature] ?? 0;
  const result = checkPlanLimit(bundle.features, feature, usage);
  if (!result.allowed) {
    throw new Error(`PLAN_LIMIT_REACHED:${feature}:${usage}:${result.limit}`);
  }
  return bundle;
}
