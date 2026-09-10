import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUS_LABELS, SALE_STATUS_LABELS } from "@/lib/sales/constants";
import type { PaymentStatus, SaleStatus } from "@/types/sales";

export function SaleStatusBadge({
  paymentStatus,
  status,
}: {
  paymentStatus: PaymentStatus;
  status: SaleStatus;
}) {
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
