import type { ExpenseStatus, PaymentMethod } from "@/types/database";

export const EXPENSE_PAGE_SIZE = 20;

export const EXPENSE_STATUS_LABELS: Record<ExpenseStatus, string> = {
  active: "Active",
  cancelled: "Annulée",
};

export function isExpenseStatus(value: string): value is ExpenseStatus {
  return value === "active" || value === "cancelled";
}

export function isPaymentMethodFilter(
  value: string,
): value is PaymentMethod | "all" {
  return (
    value === "all" ||
    value === "cash" ||
    value === "wave" ||
    value === "orange_money" ||
    value === "bank" ||
    value === "card" ||
    value === "other"
  );
}

export function shortDisplayName(fullName: string) {
  const first = fullName.trim().split(/\s+/)[0];
  return first || "Membre";
}
