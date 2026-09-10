import { Badge } from "@/components/ui/badge";
import { PURCHASE_PAYMENT_LABELS, PURCHASE_STATUS_LABELS } from "@/lib/purchases/constants";
import type { PaymentStatus, PurchaseStatus } from "@/types/purchases";

export function PurchaseStatusBadge({
  paymentStatus,
  status,
}: {
  paymentStatus: PaymentStatus;
  status: PurchaseStatus;
}) {
  if (status === "cancelled") {
    return <Badge variant="neutral">{PURCHASE_STATUS_LABELS.cancelled}</Badge>;
  }

  const variants: Record<PaymentStatus, "success" | "warning" | "danger"> = {
    paid: "success",
    partial: "warning",
    unpaid: "danger",
  };

  return <Badge variant={variants[paymentStatus]}>{PURCHASE_PAYMENT_LABELS[paymentStatus]}</Badge>;
}
