import { ReceiptFooter } from "@/components/receipts/receipt-footer";
import { ReceiptHeader } from "@/components/receipts/receipt-header";
import { ReceiptItems } from "@/components/receipts/receipt-items";
import { ReceiptPayment } from "@/components/receipts/receipt-payment";
import { ReceiptTotals } from "@/components/receipts/receipt-totals";
import {
  formatReceiptDate,
  receiptCustomerName,
  receiptPaymentLabel,
} from "@/lib/receipts/format";
import { cn } from "@/lib/utils/cn";
import type { ReceiptView } from "@/types/receipts";

export function Receipt({
  receipt,
  className,
}: {
  receipt: ReceiptView;
  className?: string;
}) {
  const cancelled = receipt.status === "cancelled";

  return (
    <article
      data-receipt-format={receipt.format}
      className={cn(
        "receipt-paper mx-auto bg-white text-black",
        receipt.format === "58mm" && "w-[58mm] px-2 py-3 text-[11px]",
        receipt.format === "80mm" && "w-[80mm] px-3 py-4 text-xs",
        receipt.format === "A4" && "w-full max-w-[190mm] px-8 py-8 text-sm",
        className,
      )}
    >
      {cancelled ? (
        <p className="mb-3 border border-black px-2 py-1 text-center text-sm font-bold tracking-wide">
          VENTE ANNULÉE
        </p>
      ) : null}
      <ReceiptHeader receipt={receipt} />
      <div className="my-3 border-t border-dashed border-black" />
      <p className="text-center text-sm font-semibold tracking-wide">REÇU</p>
      <p className="mt-1 text-center font-medium">N° {receipt.saleNumber}</p>
      <p className="text-center text-xs">Date : {formatReceiptDate(receipt.createdAt)}</p>
      {receipt.settings.showSeller ? (
        <p className="text-center text-xs">Caissier : {receipt.sellerName}</p>
      ) : null}
      <p className="mt-2 text-center text-xs font-semibold">
        {receiptPaymentLabel(receipt.paymentStatus, receipt.status)}
      </p>
      {receipt.settings.showCustomer ? (
        <div className="mt-3 text-xs">
          <p>Client :</p>
          <p className="font-medium">{receiptCustomerName(receipt.customerName)}</p>
          {receipt.customerPhone ? <p>{receipt.customerPhone}</p> : null}
        </div>
      ) : null}
      <div className="my-3 border-t border-dashed border-black" />
      <ReceiptItems receipt={receipt} />
      <div className="my-3 border-t border-dashed border-black" />
      <ReceiptTotals receipt={receipt} />
      <ReceiptPayment receipt={receipt} />
      {receipt.settings.showNotes && receipt.notes ? (
        <p className="mt-3 text-xs">{receipt.notes}</p>
      ) : null}
      <div className="my-3 border-t border-dashed border-black" />
      <ReceiptFooter receipt={receipt} />
    </article>
  );
}
