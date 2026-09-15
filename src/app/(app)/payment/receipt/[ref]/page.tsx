import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/access";
import { getPaymentTransaction, statusLabel } from "@/lib/payments/payment-service";
import { formatDate, formatFcfaAbsolute } from "@/lib/utils/format";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Reçu d'abonnement",
};

export const dynamic = "force-dynamic";

export default async function PaymentReceiptPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  await requirePermission("settings.view");
  const { ref } = await params;
  const tx = await getPaymentTransaction(decodeURIComponent(ref));

  if (!tx) {
    notFound();
  }

  return (
    <Card className="mx-auto max-w-md print:border-0 print:shadow-none">
        <div className="text-center">
          <p className="text-lg font-semibold tracking-tight">SamaGestion</p>
          <p className="mt-1 text-sm text-muted-foreground">Paiement d&apos;abonnement</p>
        </div>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Commerce</dt>
            <dd className="font-medium">{tx.business.name}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="font-medium">{tx.plan.name}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Montant</dt>
            <dd className="font-medium">{formatFcfaAbsolute(tx.amount)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Date</dt>
            <dd className="font-medium">{formatDate(tx.confirmedAt ?? tx.createdAt)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Statut</dt>
            <dd className="font-semibold uppercase">{statusLabel(tx.status)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Référence</dt>
            <dd className="font-mono text-xs">{tx.internalReference}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-col gap-2 print:hidden sm:flex-row">
          <Button href="/settings/billing" variant="outline" className="w-full">
            Historique
          </Button>
          <Button href="/settings/subscription" className="w-full">
            Abonnement
          </Button>
        </div>
    </Card>
  );
}
