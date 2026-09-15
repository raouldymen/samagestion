import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/access";
import { getPaymentTransaction } from "@/lib/payments/payment-service";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Paiement en attente",
};

export const dynamic = "force-dynamic";

export default async function PaymentPendingPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  await requirePermission("settings.view");
  const params = await searchParams;
  const ref = params.ref?.trim();
  if (!ref) {
    redirect("/settings/billing");
  }

  const tx = await getPaymentTransaction(ref);
  if (tx?.status === "successful") {
    redirect(`/payment/success?ref=${encodeURIComponent(ref)}`);
  }
  if (tx?.status === "failed" || tx?.status === "cancelled") {
    redirect(`/payment/failed?ref=${encodeURIComponent(ref)}`);
  }

  return (
    <>
      <PageHeader title="Paiement en attente" />
      <Card className="mx-auto max-w-md space-y-4 text-center">
        <h2 className="text-xl font-semibold">Paiement en attente</h2>
        <p className="text-sm text-muted-foreground">
          Nous attendons la confirmation du prestataire.
        </p>
        <p className="font-mono text-sm">Référence : {ref}</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button href={`/payment/success?ref=${encodeURIComponent(ref)}`}>
            Vérifier maintenant
          </Button>
          <Button href="/settings/billing" variant="outline">
            Historique
          </Button>
        </div>
      </Card>
    </>
  );
}
