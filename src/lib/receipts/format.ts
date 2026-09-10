import { paymentMethodLabel } from "@/lib/sales/constants";
import type { PaymentStatus, SaleStatus } from "@/types/database";
import type { ReceiptFormat } from "@/types/settings";

const amountFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

const receiptDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Africa/Dakar",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const receiptDateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Africa/Dakar",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatReceiptAmount(amount: number) {
  return amountFormatter.format(amount);
}

export function formatReceiptMoney(amount: number) {
  return `${formatReceiptAmount(amount)} FCFA`;
}

export function formatReceiptDate(isoDate: string) {
  return receiptDateFormatter.format(new Date(isoDate));
}

export function formatReceiptDateTime(isoDate: string) {
  return receiptDateTimeFormatter.format(new Date(isoDate));
}

export function receiptCustomerName(name: string | null | undefined) {
  const trimmed = name?.trim();
  return trimmed ? trimmed : "Client comptoir";
}

export function receiptPaymentLabel(status: PaymentStatus, saleStatus: SaleStatus) {
  if (saleStatus === "cancelled") {
    return "VENTE ANNULÉE";
  }

  if (status === "paid") {
    return "PAYÉ";
  }

  if (status === "partial") {
    return "PARTIEL";
  }

  return "À CRÉDIT";
}

export function receiptModeLabel(method: Parameters<typeof paymentMethodLabel>[0]) {
  return paymentMethodLabel(method);
}

export function receiptPageWidth(format: ReceiptFormat) {
  if (format === "58mm") {
    return "58mm";
  }

  if (format === "80mm") {
    return "80mm";
  }

  return "190mm";
}

export function sampleReceiptTotals(paid: number, total: number) {
  const amountDue = Math.max(0, Math.round((total - paid) * 100) / 100);
  const paymentStatus: PaymentStatus = amountDue <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid";

  return { total, amountPaid: paid, amountDue, paymentStatus };
}
