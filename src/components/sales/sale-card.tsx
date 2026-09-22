import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PendingSaleActions } from "@/components/sales/pending-sale-actions";
import { SaleStatusBadge } from "@/components/sales/sale-status-badge";
import { paymentMethodLabel } from "@/lib/sales/constants";
import { formatDateTime, formatFcfaAbsolute } from "@/lib/utils/format";
import type { SaleListItem } from "@/types/sales";

export function SaleCard({ sale, canManagePending = false }: { sale: SaleListItem; canManagePending?: boolean }) {
  const content = (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="flex flex-wrap items-baseline gap-x-2 font-semibold">
          <span>{sale.saleNumber}</span>
          <span className={sale.isReturned ? "line-through text-muted-foreground" : ""}>
            {formatFcfaAbsolute(sale.total)}
          </span>
        </p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">
          {formatDateTime(sale.createdAt)} · {sale.customerName ?? "Aucun client"} ·{" "}
          {sale.awaitingCashier ? "À encaisser à la caisse" : paymentMethodLabel(sale.paymentMethod)} · Vendeur : {sale.sellerName}
        </p>
      </div>
      <SaleStatusBadge paymentStatus={sale.paymentStatus} status={sale.status} awaitingCashier={sale.awaitingCashier} isReturned={sale.isReturned} />
    </div>
  );

  return (
    <Card className="p-3 sm:p-3">
      {sale.awaitingCashier ? (
        <div>
          {content}
          {canManagePending ? (
            <div className="mt-2">
              <PendingSaleActions sale={sale} />
            </div>
          ) : null}
        </div>
      ) : (
        <Link href={`/sales/${sale.id}`} className="block">{content}</Link>
      )}
    </Card>
  );
}
