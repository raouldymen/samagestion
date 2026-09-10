import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CancelPurchaseButton } from "@/components/purchases/cancel-purchase-button";
import { PurchaseDetails } from "@/components/purchases/purchase-details";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { getPurchase } from "@/lib/purchases/queries";

export const metadata: Metadata = {
  title: "Détail de l'achat",
};

export default async function PurchaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireBusinessSession();
  const { id } = await params;
  const purchase = await getPurchase(id);

  if (!purchase) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={`Achat ${purchase.purchaseNumber}`}
        description={purchase.status === "cancelled" ? "Cet achat a été annulé." : undefined}
        actions={
          can(session.role, "purchases.manage") && purchase.status === "completed" ? (
            <CancelPurchaseButton purchase={purchase} />
          ) : null
        }
      />
      <PurchaseDetails purchase={purchase} />
    </>
  );
}
