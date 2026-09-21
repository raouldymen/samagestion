import type { Metadata } from "next";
import { PlanBadge } from "@/components/subscriptions/plan-badge";
import { SubscriptionActions } from "@/components/subscriptions/subscription-actions";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { hasPermission } from "@/lib/auth/permissions";
import { requireSettingsSection } from "@/lib/settings/access";
import { getSubscriptionBundle } from "@/lib/subscriptions/queries";
import { formatDate, formatFcfaAbsolute } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Abonnement",
};

export default async function SubscriptionSettingsPage() {
  const session = await requireSettingsSection("subscription");
  const bundle = await getSubscriptionBundle();
  const { plan, subscription } = bundle;
  const canEdit = hasPermission(session.role, "settings.edit");

  return (
    <>
      <PageHeader
        title="Votre abonnement"
        description="Consultez votre plan et gérez le renouvellement."
      />
      {subscription.status === "past_due" ? (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Votre abonnement nécessite une action. Veuillez effectuer le paiement pour conserver
          vos fonctionnalités {plan.name}.
        </p>
      ) : null}
      <Card className="max-w-xl">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-semibold uppercase tracking-tight">{plan.name}</h2>
          <PlanBadge slug={plan.slug} />
        </div>
        <p className="mt-2 text-lg">
          {formatFcfaAbsolute(plan.priceMonthly)}
          {plan.priceMonthly > 0 ? (
            <span className="text-sm text-muted-foreground"> / mois</span>
          ) : null}
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Statut</dt>
            <dd className="font-medium">{subscription.status}</dd>
          </div>
          {subscription.currentPeriodEnd ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Prochaine échéance</dt>
              <dd className="font-medium">{formatDate(subscription.currentPeriodEnd)}</dd>
            </div>
          ) : (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">Période</dt>
              <dd className="font-medium">Sans échéance</dd>
            </div>
          )}
          {subscription.cancelAtPeriodEnd ? (
            <p className="text-amber-700">
              Annulation prévue à la fin de la période en cours.
            </p>
          ) : null}
        </dl>
        <SubscriptionActions
          planSlug={plan.slug}
          cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
          isPaid={plan.priceMonthly > 0}
          canEdit={canEdit}
        />
      </Card>
    </>
  );
}
