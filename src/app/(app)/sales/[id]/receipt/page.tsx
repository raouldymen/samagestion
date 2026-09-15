import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Receipt } from "@/components/receipts/receipt";
import { ReceiptActions } from "@/components/receipts/receipt-actions";
import { ReceiptFormatSwitch } from "@/components/settings/receipt-format-selector";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/access";
import { getReceiptView } from "@/lib/receipts/queries";
import { isReceiptFormat } from "@/lib/settings/constants";

export const metadata: Metadata = {
  title: "Reçu",
};

export default async function SaleReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ format?: string }>;
}) {
  await requirePermission("sales.view");
  const { id } = await params;
  const query = await searchParams;
  const format = query.format && isReceiptFormat(query.format) ? query.format : undefined;
  const receipt = await getReceiptView(id, format);

  if (!receipt) {
    notFound();
  }

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={`Reçu ${receipt.saleNumber}`}
          description={receipt.status === "cancelled" ? "Cette vente a été annulée." : "Impression, PDF et partage."}
        />
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <ReceiptFormatSwitch saleId={receipt.saleId} format={receipt.format} />
          <ReceiptActions receipt={receipt} />
        </div>
      </div>
      <Receipt receipt={receipt} />
    </>
  );
}
