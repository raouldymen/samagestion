import type { Metadata } from "next";
import Link from "next/link";
import { PlanBadge } from "@/components/subscriptions/plan-badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/access";
import { statusLabel } from "@/lib/payments/payment-service";
import {
  getSubscriptionBundle,
  listBillingTransactions,
} from "@/lib/subscriptions/queries";
import { formatDate, formatFcfaAbsolute } from "@/lib/utils/format";
import type { PaymentTransactionStatus } from "@/lib/payments/types";

export const metadata: Metadata = {
  title: "Facturation",
};

export default async function BillingSettingsPage() {
  await requirePermission("settings.view");
  const [bundle, transactions] = await Promise.all([
    getSubscriptionBundle(),
    listBillingTransactions(),
  ]);

  return (
    <>
      <PageHeader title="Facturation" description="Plan actuel et historique des paiements." />
      <Card className="mb-4 max-w-xl">
        <div className="flex items-center gap-2">
          <p className="font-semibold">Plan actuel</p>
          <PlanBadge slug={bundle.plan.slug} />
        </div>
        <p className="mt-2 text-lg">
          {bundle.plan.name} — {formatFcfaAbsolute(bundle.plan.priceMonthly)}
          {bundle.plan.priceMonthly > 0 ? " / mois" : ""}
        </p>
        {bundle.subscription.status === "past_due" ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Votre abonnement nécessite une action. Effectuez le paiement pour conserver vos
            fonctionnalités {bundle.plan.name}.
          </p>
        ) : null}
      </Card>
      <h2 className="mb-3 text-base font-semibold">Historique des paiements</h2>
      {transactions.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Aucun paiement enregistré pour le moment.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {transactions.map((tx) => (
            <li
              key={tx.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">{formatDate(tx.createdAt)}</p>
                <p className="text-muted-foreground">
                  {tx.planName ?? tx.provider}
                  {tx.internalReference ? ` · ${tx.internalReference}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-medium">{formatFcfaAbsolute(tx.amount)}</p>
                <p className="text-muted-foreground">
                  {statusLabel(tx.status as PaymentTransactionStatus)}
                </p>
                {tx.internalReference ? (
                  <Link
                    href={`/payment/receipt/${encodeURIComponent(tx.internalReference)}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Reçu
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
