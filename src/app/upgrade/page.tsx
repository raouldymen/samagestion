import type { Metadata } from "next";
import { Check } from "lucide-react";
import { PlanBadge } from "@/components/subscriptions/plan-badge";
import { UpgradeContinueButton } from "@/components/subscriptions/upgrade-continue-button";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/access";
import { FEATURE_LABELS, isPlanFeatureKey, isPlanSlug } from "@/lib/subscriptions/constants";
import { getSubscriptionBundle, listSubscriptionPlans } from "@/lib/subscriptions/queries";
import { formatFcfaAbsolute } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Passer à Pro",
};

export const dynamic = "force-dynamic";

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; feature?: string; limit?: string }>;
}) {
  await requirePermission("settings.view");
  const params = await searchParams;
  const bundle = await getSubscriptionBundle();
  const plans = await listSubscriptionPlans();
  const requested = params.plan && isPlanSlug(params.plan) ? params.plan : "pro";
  const target = plans.find((plan) => plan.slug === requested) ?? plans.find((p) => p.slug === "pro");
  const featureHint =
    (params.feature && isPlanFeatureKey(params.feature) && FEATURE_LABELS[params.feature]) ||
    (params.limit && isPlanFeatureKey(params.limit) && FEATURE_LABELS[params.limit]) ||
    null;

  if (!target) {
    return (
      <AuthenticatedShell>
        <PageHeader title="Upgrade" description="Aucun plan disponible." />
      </AuthenticatedShell>
    );
  }

  const highlights = [
    target.features.products?.limit == null
      ? "Produits illimités"
      : `${target.features.products.limit} produits`,
    target.features.sales_monthly?.limit == null
      ? "Ventes illimitées"
      : `${target.features.sales_monthly.limit} ventes / mois`,
    "Rapports financiers",
    "Exports",
    target.features.team_members?.limit
      ? `${target.features.team_members.limit} utilisateurs`
      : "Équipe",
  ];

  return (
    <AuthenticatedShell>
      <PageHeader
        title={`Passez à SamaGestion ${target.name}`}
        description={`Vous êtes actuellement sur ${bundle.plan.name}.`}
      />
      {featureHint ? (
        <p className="mb-4 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm">
          Fonctionnalité demandée : <strong>{featureHint}</strong>
        </p>
      ) : null}
      <Card className="max-w-xl">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Avec {target.name}</h2>
          <PlanBadge slug={target.slug} />
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {highlights.map((line) => (
            <li key={line} className="flex items-center gap-2">
              <Check className="size-4 text-primary" aria-hidden="true" />
              {line}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-2xl font-semibold">
          {formatFcfaAbsolute(target.priceMonthly)}
          <span className="text-sm font-normal text-muted-foreground"> / mois</span>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Vous serez redirigé vers le paiement sécurisé. L&apos;abonnement ne s&apos;active
          qu&apos;après confirmation serveur.
        </p>
        <UpgradeContinueButton plan={target.slug} />
      </Card>
    </AuthenticatedShell>
  );
}
