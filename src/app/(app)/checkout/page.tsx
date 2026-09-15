import type { Metadata } from "next";
import { Check } from "lucide-react";
import { CheckoutPayButton } from "@/components/payments/checkout-pay-button";
import { PlanBadge } from "@/components/subscriptions/plan-badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/access";
import { isPlanSlug } from "@/lib/subscriptions/constants";
import { getSubscriptionBundle, listSubscriptionPlans } from "@/lib/subscriptions/queries";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Paiement",
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const session = await requirePermission("settings.edit");
  const params = await searchParams;
  const plans = await listSubscriptionPlans();
  const bundle = await getSubscriptionBundle();

  const requested = params.plan && isPlanSlug(params.plan) ? params.plan : "pro";
  const plan = plans.find((p) => p.slug === requested && p.priceMonthly > 0);

  if (!plan) {
    redirect("/pricing");
  }

  if (bundle.plan.slug === plan.slug && bundle.subscription.isActive) {
    redirect("/settings/subscription");
  }

  const highlights = [
    plan.features.products?.limit == null
      ? "Produits illimités"
      : `${plan.features.products.limit} produits`,
    plan.features.sales_monthly?.limit == null
      ? "Ventes illimitées"
      : `${plan.features.sales_monthly.limit} ventes / mois`,
    "Rapports financiers",
    "Exports",
    plan.features.team_members?.limit
      ? `${plan.features.team_members.limit} utilisateurs`
      : "Équipe",
  ];

  return (
    <>
      <PageHeader
        title={`Abonnement ${plan.name}`}
        description="Payez par Wave ou Orange Money. Vérifiez le commerce et le montant."
      />
      <Card className="mx-auto max-w-lg">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Commerce</dt>
            <dd className="font-medium">{session.business.name}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="flex items-center gap-2 font-medium">
              {plan.name}
              <PlanBadge slug={plan.slug} />
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Prix</dt>
            <dd className="font-medium">
              {formatFcfaAbsolute(plan.priceMonthly)} / mois
            </dd>
          </div>
        </dl>

        <ul className="mt-5 space-y-2 text-sm">
          {highlights.map((line) => (
            <li key={line} className="flex items-center gap-2">
              <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />
              {line}
            </li>
          ))}
        </ul>

        <div className="mt-6 rounded-xl bg-muted/60 px-4 py-3">
          <p className="text-sm text-muted-foreground">Montant</p>
          <p className="text-2xl font-semibold tracking-tight">
            {formatFcfaAbsolute(plan.priceMonthly)}
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-border px-4 py-3">
          <p className="text-sm font-medium text-foreground">Paiement mobile</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Wave ou Orange Money · XOF (FCFA)
          </p>
        </div>

        <CheckoutPayButton planId={plan.id} />
      </Card>
    </>
  );
}
