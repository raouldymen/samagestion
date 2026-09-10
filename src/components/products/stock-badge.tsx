import { Badge } from "@/components/ui/badge";
import { STOCK_STATUS_LABELS } from "@/lib/products/constants";
import type { StockStatus } from "@/types/products";

const VARIANTS: Record<StockStatus, "success" | "warning" | "danger"> = {
  in_stock: "success",
  low: "warning",
  out: "danger",
};

export function StockBadge({
  status,
  isActive,
}: {
  status: StockStatus;
  isActive: boolean;
}) {
  if (!isActive) {
    return <Badge variant="neutral">Inactif</Badge>;
  }

  return <Badge variant={VARIANTS[status]}>{STOCK_STATUS_LABELS[status]}</Badge>;
}
