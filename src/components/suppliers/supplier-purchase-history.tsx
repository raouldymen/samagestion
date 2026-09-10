import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PurchaseStatusBadge } from "@/components/purchases/purchase-status-badge";
import { formatCalendarDate, formatFcfaAbsolute } from "@/lib/utils/format";
import type { PurchaseListItem } from "@/types/purchases";

export function SupplierPurchaseHistory({ purchases }: { purchases: PurchaseListItem[] }) {
  return (
    <section aria-labelledby="supplier-purchases-title">
      <Card>
        <CardHeader>
          <CardTitle id="supplier-purchases-title">Historique des achats</CardTitle>
        </CardHeader>
        {purchases.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun achat pour ce fournisseur.</p>
        ) : (
          <ul className="divide-y divide-border">
            {purchases.map((purchase) => (
              <li key={purchase.id} className="py-3 first:pt-0 last:pb-0">
                <Link href={`/purchases/${purchase.id}`} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{purchase.purchaseNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCalendarDate(purchase.purchaseDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatFcfaAbsolute(purchase.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      Payé {formatFcfaAbsolute(purchase.amountPaid)} · Reste{" "}
                      {formatFcfaAbsolute(purchase.amountDue)}
                    </p>
                    <div className="mt-1 flex justify-end">
                      <PurchaseStatusBadge
                        paymentStatus={purchase.paymentStatus}
                        status={purchase.status}
                      />
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
