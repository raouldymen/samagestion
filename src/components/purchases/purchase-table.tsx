import Link from "next/link";
import { PurchaseStatusBadge } from "@/components/purchases/purchase-status-badge";
import { formatCalendarDate, formatFcfaAbsolute } from "@/lib/utils/format";
import type { PurchaseListItem } from "@/types/purchases";

export function PurchaseTable({ purchases }: { purchases: PurchaseListItem[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm lg:block">
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead className="border-b border-border bg-muted/60 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">N°</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Fournisseur</th>
            <th className="px-4 py-3 font-medium">Articles</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Payé</th>
            <th className="px-4 py-3 font-medium">Reste</th>
            <th className="px-4 py-3 font-medium">Statut</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {purchases.map((purchase) => (
            <tr key={purchase.id} className="hover:bg-muted/40">
              <td className="px-4 py-3 font-medium">{purchase.purchaseNumber}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatCalendarDate(purchase.purchaseDate)}
              </td>
              <td className="px-4 py-3">{purchase.supplierName ?? "—"}</td>
              <td className="px-4 py-3">{purchase.itemsCount}</td>
              <td className="px-4 py-3">{formatFcfaAbsolute(purchase.total)}</td>
              <td className="px-4 py-3">{formatFcfaAbsolute(purchase.amountPaid)}</td>
              <td className="px-4 py-3">{formatFcfaAbsolute(purchase.amountDue)}</td>
              <td className="px-4 py-3">
                <PurchaseStatusBadge paymentStatus={purchase.paymentStatus} status={purchase.status} />
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/purchases/${purchase.id}`}
                  className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Voir
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
