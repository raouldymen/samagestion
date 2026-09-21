import Link from "next/link";
import { PendingSaleActions } from "@/components/sales/pending-sale-actions";
import { SaleStatusBadge } from "@/components/sales/sale-status-badge";
import { paymentMethodLabel } from "@/lib/sales/constants";
import { formatDateTime, formatFcfaAbsolute } from "@/lib/utils/format";
import type { SaleListItem } from "@/types/sales";

export function SalesTable({ sales }: { sales: SaleListItem[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm lg:block">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b border-border bg-muted/60 text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">N°</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Client</th>
            <th className="px-4 py-3 font-medium">Vendeur</th>
            <th className="px-4 py-3 font-medium">Total</th>
            <th className="px-4 py-3 font-medium">Paiement</th>
            <th className="px-4 py-3 font-medium">Statut</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sales.map((sale) => (
            <tr key={sale.id} className="hover:bg-muted/40">
              <td className="px-4 py-3 font-medium">{sale.saleNumber}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatDateTime(sale.createdAt)}</td>
              <td className="px-4 py-3">{sale.customerName ?? "—"}</td>
              <td className="px-4 py-3">{sale.sellerName}</td>
              <td className={`px-4 py-3 ${sale.isReturned ? "line-through text-muted-foreground" : ""}`}>{formatFcfaAbsolute(sale.total)}</td>
              <td className="px-4 py-3">{paymentMethodLabel(sale.paymentMethod)}</td>
              <td className="px-4 py-3">
                <SaleStatusBadge paymentStatus={sale.paymentStatus} status={sale.status} awaitingCashier={sale.awaitingCashier} isReturned={sale.isReturned} />
              </td>
              <td className="px-4 py-3">
                {sale.awaitingCashier ? (
                  <PendingSaleActions sale={sale} />
                ) : (
                  <Link
                    href={`/sales/${sale.id}`}
                    className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Voir
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
