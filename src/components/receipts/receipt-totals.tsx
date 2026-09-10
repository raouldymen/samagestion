import { formatReceiptAmount } from "@/lib/receipts/format";
import { displayCurrency } from "@/lib/settings/constants";
import type { ReceiptView } from "@/types/receipts";

export function ReceiptTotals({ receipt }: { receipt: ReceiptView }) {
  return (
    <dl className="mt-3 space-y-0.5 text-xs">
      <div className="flex justify-between gap-3">
        <dt>Sous-total</dt>
        <dd>{formatReceiptAmount(receipt.subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt>Remise</dt>
        <dd>{formatReceiptAmount(receipt.discount)}</dd>
      </div>
      <div className="flex justify-between gap-3 text-sm font-semibold">
        <dt>TOTAL</dt>
        <dd>
          {formatReceiptAmount(receipt.total)} {displayCurrency(receipt.currency)}
        </dd>
      </div>
    </dl>
  );
}
