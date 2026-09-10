import type {
  PlanFeatureConfig,
  PlanFeatureKey,
  SubscriptionBundle,
  UsageMeter,
} from "@/types/subscriptions";
import { FEATURE_LABELS } from "@/lib/subscriptions/constants";

export function hasFeature(
  features: Record<string, PlanFeatureConfig>,
  feature: PlanFeatureKey,
) {
  return features[feature]?.enabled === true;
}

export function getPlanLimit(
  features: Record<string, PlanFeatureConfig>,
  feature: PlanFeatureKey,
): number | null {
  const config = features[feature];
  if (!config?.enabled) {
    return 0;
  }
  return config.limit;
}

export function checkPlanLimit(
  features: Record<string, PlanFeatureConfig>,
  feature: PlanFeatureKey,
  usage: number,
): { allowed: boolean; limit: number | null; usage: number } {
  const limit = getPlanLimit(features, feature);
  if (limit === null) {
    return { allowed: true, limit: null, usage };
  }
  return { allowed: usage < limit, limit, usage };
}

export function usageMeters(bundle: SubscriptionBundle): UsageMeter[] {
  const keys: PlanFeatureKey[] = ["products", "sales_monthly", "customers", "team_members"];
  const usageMap: Record<string, number> = {
    products: bundle.usage.products,
    sales_monthly: bundle.usage.salesMonthly,
    customers: bundle.usage.customers,
    team_members: bundle.usage.teamMembers,
  };

  return keys.map((key) => {
    const limit = getPlanLimit(bundle.features, key);
    const used = usageMap[key] ?? 0;
    const unlimited = limit === null;
    const ratio = unlimited || limit === 0 ? null : used / limit;
    return {
      key,
      label: FEATURE_LABELS[key],
      used,
      limit,
      unlimited,
      ratio,
      warning: ratio !== null && ratio >= 0.8 && ratio < 1,
      blocked: ratio !== null && ratio >= 1,
    };
  });
}

export function mapPlanLimitError(message: string) {
  const match = message.match(/PLAN_LIMIT_REACHED:([^:]+):(\d+):(\d+)/i);
  if (!match) {
    return null;
  }
  return {
    feature: match[1] as PlanFeatureKey,
    usage: Number(match[2]),
    limit: Number(match[3]),
  };
}

export function mapFeatureError(message: string) {
  const match = message.match(/FEATURE_NOT_AVAILABLE:([a-z_]+)/i);
  return match ? (match[1] as PlanFeatureKey) : null;
}
