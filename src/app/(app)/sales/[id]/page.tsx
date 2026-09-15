import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CancelSaleButton } from "@/components/sales/cancel-sale-button";
import { SaleDetails } from "@/components/sales/sale-details";
import { PageHeader } from "@/components/ui/page-header";
import { canCancelSale } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { getSale } from "@/lib/sales/queries";

export const metadata: Metadata = {
  title: "Détail de la vente",
};

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireBusinessSession();
  const { id } = await params;
  const sale = await getSale(id);

  if (!sale) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={`Vente ${sale.saleNumber}`}
        description={sale.status === "cancelled" ? "Cette vente a été annulée." : undefined}
        actions={
          canCancelSale(session.role, sale.userId === session.user.id) ? (
            <CancelSaleButton sale={sale} />
          ) : null
        }
      />
      <SaleDetails sale={sale} />
    </>
  );
}
