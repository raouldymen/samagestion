import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/access";

export const metadata: Metadata = {
  title: "Paiement non confirmé",
};

export const dynamic = "force-dynamic";

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  await requirePermission("settings.view");
  const params = await searchParams;
  const ref = params.ref?.trim();

  return (
    <>
      <PageHeader title="Paiement" />
      <Card className="mx-auto max-w-md space-y-4 text-center">
        <h2 className="text-xl font-semibold">Paiement non confirmé</h2>
        <p className="text-sm text-muted-foreground">
          Votre paiement n&apos;a pas pu être confirmé. Votre abonnement n&apos;a pas été modifié.
        </p>
        {ref ? (
          <p className="text-xs text-muted-foreground">Référence : {ref}</p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button href="/checkout?plan=pro">Réessayer</Button>
          <Button href="/settings/subscription" variant="outline">
            Retour aux abonnements
          </Button>
        </div>
      </Card>
    </>
  );
}
