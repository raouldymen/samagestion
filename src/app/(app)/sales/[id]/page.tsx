import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CancelSaleButton } from "@/components/sales/cancel-sale-button";
import { PartialReturnSaleButton } from "@/components/sales/partial-return-sale-button";
import { SaleDetails } from "@/components/sales/sale-details";
import { PageHeader } from "@/components/ui/page-header";
import { canCancelSale } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { getSale } from "@/lib/sales/queries";
import { canCancelSaleUntil } from "@/lib/sales/constants";

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
        actions={<div className="flex flex-wrap gap-2">{canCancelSale(session.role, sale.userId === session.user.id) && canCancelSaleUntil(sale.createdAt) ? <CancelSaleButton sale={sale} /> : null}{sale.status === "completed" && ['owner','manager','cashier'].includes(session.role) ? <PartialReturnSaleButton sale={sale} /> : null}</div>}
      />
      <SaleDetails sale={sale} />
    </>
  );
}
