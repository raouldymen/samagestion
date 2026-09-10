import type { PaymentStatus, PurchaseStatus } from "@/types/database";
import { lineTotal, saleTotals } from "@/lib/sales/constants";
import type { PurchaseCartLine } from "@/types/purchases";

export const PURCHASE_PAGE_SIZE = 20;

export const PURCHASE_STATUS_LABELS: Record<PurchaseStatus, string> = {
  completed: "Terminé",
  cancelled: "Annulé",
};

export const PURCHASE_PAYMENT_LABELS: Record<PaymentStatus, string> = {
  paid: "Payé",
  partial: "Partiel",
  unpaid: "Impayé",
};

export function purchaseLineTotal(quantity: number, unitCost: number) {
  return lineTotal(quantity, unitCost);
}

export function purchaseCartSubtotal(lines: PurchaseCartLine[]) {
  return lines.reduce((sum, line) => sum + purchaseLineTotal(line.quantity, line.unitCost), 0);
}

export function purchaseTotals(subtotal: number, discount: number, amountPaid: number) {
  return saleTotals(subtotal, discount, amountPaid);
}
