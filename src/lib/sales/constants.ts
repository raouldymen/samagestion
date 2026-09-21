import type { PaymentMethod, PaymentStatus } from "../../types/sales";

export const SALE_PAGE_SIZE = 20;
export const SALE_CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000;

export function canCancelSaleUntil(createdAt: string, now = Date.now()) {
  const createdAtMs = new Date(createdAt).getTime();
  return Number.isFinite(createdAtMs) && now - createdAtMs <= SALE_CANCELLATION_WINDOW_MS;
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Espèces" },
  { value: "wave", label: "Wave" },
  { value: "orange_money", label: "Orange Money" },
  { value: "bank", label: "Banque" },
  { value: "card", label: "Carte" },
  { value: "other", label: "Autre" },
];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "Payée",
  partial: "Partiellement payée",
  unpaid: "Impayée",
};

export const SALE_STATUS_LABELS = {
  completed: "Terminée",
  cancelled: "Annulée",
} as const;

export function paymentMethodLabel(method: PaymentMethod | null) {
  if (!method) {
    return "—";
  }

  return PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method;
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return PAYMENT_METHODS.some((method) => method.value === value);
}

export function lineTotal(quantity: number, unitPrice: number) {
  return Math.round(quantity * unitPrice * 100) / 100;
}

export function cartSubtotal(lines: { quantity: number; unitPrice: number }[]) {
  return lines.reduce((sum, line) => sum + lineTotal(line.quantity, line.unitPrice), 0);
}

export function saleTotals(subtotal: number, discount: number, amountPaid: number) {
  const total = Math.round((subtotal - discount) * 100) / 100;
  const amountDue = Math.round((total - amountPaid) * 100) / 100;
  const paymentStatus = paymentStatusFromAmounts(total, amountPaid, amountDue);

  return { subtotal, discount, total, amountPaid, amountDue, paymentStatus };
}

export function paymentStatusFromAmounts(
  total: number,
  amountPaid: number,
  amountDue = total - amountPaid,
): PaymentStatus {
  if (amountDue <= 0) {
    return "paid";
  }

  if (amountPaid > 0) {
    return "partial";
  }

  return "unpaid";
}

export function periodRange(
  period: "today" | "week" | "month" | "custom",
  from?: string,
  to?: string,
) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === "today") {
    return { from: startOfToday.toISOString(), to: now.toISOString() };
  }

  if (period === "week") {
    const start = new Date(startOfToday);
    const weekday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - weekday);
    return { from: start.toISOString(), to: now.toISOString() };
  }

  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: start.toISOString(), to: now.toISOString() };
  }

  return {
    from: from ? new Date(`${from}T00:00:00`).toISOString() : undefined,
    to: to ? new Date(`${to}T23:59:59.999`).toISOString() : undefined,
  };
}
