import { formatReceiptAmount, receiptModeLabel } from "@/lib/receipts/format";
import { displayCurrency } from "@/lib/settings/constants";
import type { ReceiptView } from "@/types/receipts";

export function ReceiptPayment({ receipt }: { receipt: ReceiptView }) {
  const currency = displayCurrency(receipt.currency);

  return (
    <dl className="mt-2 space-y-0.5 text-xs">
      <div className="flex justify-between gap-3">
        <dt>Payé</dt>
        <dd>
          {formatReceiptAmount(receipt.amountPaid)} {currency}
        </dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt>Reste</dt>
        <dd>
          {formatReceiptAmount(receipt.amountDue)} {currency}
        </dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt>Mode</dt>
        <dd>{receiptModeLabel(receipt.paymentMethod)}</dd>
      </div>
    </dl>
  );
}
