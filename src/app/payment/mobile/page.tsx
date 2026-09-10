import type { Metadata } from "next";
import { MobilePaymentForm } from "@/components/payments/mobile-payment-form";
import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/access";
import { getPaymentTransaction, statusLabel } from "@/lib/payments/payment-service";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Paiement mobile",
};

export const dynamic = "force-dynamic";

export default async function MobilePaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  await requirePermission("settings.edit");
  const params = await searchParams;
  const ref = params.ref?.trim();
  if (!ref) {
    redirect("/checkout");
  }

  const tx = await getPaymentTransaction(ref);
  if (!tx) {
    redirect("/payment/failed");
  }

  if (tx.status === "successful") {
    redirect(`/payment/success?ref=${encodeURIComponent(ref)}`);
  }

  return (
    <AuthenticatedShell>
      <PageHeader
        title="Paiement mobile"
        description="Payez votre abonnement avec Wave ou Orange Money."
      />
      <Card className="mx-auto max-w-md">
        <dl className="space-y-2 text-sm">
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
            <dt className="text-muted-foreground">Statut</dt>
            <dd className="font-medium">{statusLabel(tx.status)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Référence</dt>
            <dd className="font-mono text-xs">{tx.internalReference}</dd>
          </div>
        </dl>
        <MobilePaymentForm
          reference={tx.internalReference}
          amount={tx.amount}
          currency={tx.currency}
          environment={tx.environment}
        />
      </Card>
    </AuthenticatedShell>
  );
}
