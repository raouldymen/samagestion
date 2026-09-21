import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUS_LABELS, SALE_STATUS_LABELS } from "@/lib/sales/constants";
import type { PaymentStatus, SaleStatus } from "@/types/sales";

export function SaleStatusBadge({
  paymentStatus,
  status,
  awaitingCashier = false,
  isReturned = false,
}: {
  paymentStatus: PaymentStatus;
  status: SaleStatus;
  awaitingCashier?: boolean;
  isReturned?: boolean;
}) {
  if (awaitingCashier) {
    return <Badge variant="warning">En attente</Badge>;
  }

  if (isReturned) return <Badge variant="neutral">Retournée</Badge>;

  if (status === "cancelled") {
    return <Badge variant="neutral">{SALE_STATUS_LABELS.cancelled}</Badge>;
  }

  const variants: Record<PaymentStatus, "success" | "warning" | "danger"> = {
    paid: "success",
    partial: "warning",
    unpaid: "danger",
  };

  return <Badge variant={variants[paymentStatus]}>{PAYMENT_STATUS_LABELS[paymentStatus]}</Badge>;
}
