import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PurchaseStatusBadge } from "@/components/purchases/purchase-status-badge";
import { formatCalendarDate, formatFcfaAbsolute } from "@/lib/utils/format";
import type { PurchaseListItem } from "@/types/purchases";

export function PurchaseCard({ purchase }: { purchase: PurchaseListItem }) {
  return (
    <Card className="p-4">
      <Link href={`/purchases/${purchase.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{purchase.purchaseNumber}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatCalendarDate(purchase.purchaseDate)}
            </p>
          </div>
          <PurchaseStatusBadge paymentStatus={purchase.paymentStatus} status={purchase.status} />
        </div>
        <p className="mt-3 text-lg font-semibold">{formatFcfaAbsolute(purchase.total)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {purchase.supplierName ?? "Sans fournisseur"} · {purchase.itemsCount} article
          {purchase.itemsCount > 1 ? "s" : ""}
        </p>
      </Link>
    </Card>
  );
}
