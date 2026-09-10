import { UpgradeCard } from "@/components/subscriptions/upgrade-card";
import { getSubscriptionBundle } from "@/lib/subscriptions/queries";
import { hasFeature } from "@/lib/subscriptions/limits";
import type { PlanFeatureKey } from "@/types/subscriptions";
import { FEATURE_LABELS } from "@/lib/subscriptions/constants";

export async function FeatureGate({
  feature,
  children,
  fallback,
}: {
  feature: PlanFeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const bundle = await getSubscriptionBundle();

  if (!hasFeature(bundle.features, feature)) {
    return (
      fallback ?? (
        <UpgradeCard
          title={`Fonctionnalité ${feature === "audit_logs" ? "Business" : "Pro"}`}
          description={`${FEATURE_LABELS[feature]} n'est pas inclus dans le plan ${bundle.plan.name}.`}
          ctaHref={`/upgrade?feature=${feature}`}
        />
      )
    );
  }

  return children;
}
