import Link from "next/link";
import { Card } from "@/components/ui/card";
import { SaleStatusBadge } from "@/components/sales/sale-status-badge";
import { paymentMethodLabel } from "@/lib/sales/constants";
import { formatDateTime, formatFcfaAbsolute } from "@/lib/utils/format";
import type { SaleListItem } from "@/types/sales";

export function SaleCard({ sale }: { sale: SaleListItem }) {
  return (
    <Card className="p-4">
      <Link href={`/sales/${sale.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{sale.saleNumber}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{formatDateTime(sale.createdAt)}</p>
          </div>
          <SaleStatusBadge paymentStatus={sale.paymentStatus} status={sale.status} />
        </div>
        <p className="mt-3 text-lg font-semibold">{formatFcfaAbsolute(sale.total)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {sale.customerName ?? "Aucun client"} · {paymentMethodLabel(sale.paymentMethod)}
        </p>
      </Link>
    </Card>
  );
}
