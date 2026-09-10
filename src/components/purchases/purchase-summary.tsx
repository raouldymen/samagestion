import { formatFcfaAbsolute } from "@/lib/utils/format";

export function PurchaseSummary({
  subtotal,
  discount,
  total,
}: {
  subtotal: number;
  discount: number;
  total: number;
}) {
  return (
    <dl className="divide-y divide-border rounded-xl border border-border bg-card px-4 py-2 text-sm">
      <div className="flex items-center justify-between py-2">
        <dt className="text-muted-foreground">Sous-total</dt>
        <dd className="font-medium">{formatFcfaAbsolute(subtotal)}</dd>
      </div>
      <div className="flex items-center justify-between py-2">
        <dt className="text-muted-foreground">Remise</dt>
        <dd className="font-medium">{formatFcfaAbsolute(discount)}</dd>
      </div>
      <div className="flex items-center justify-between py-3">
        <dt className="text-base font-semibold">TOTAL</dt>
        <dd className="text-base font-semibold">{formatFcfaAbsolute(total)}</dd>
      </div>
    </dl>
  );
}
