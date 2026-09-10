import type { BusinessRole } from "@/types/database";
import type {
  NotificationEntityType,
  NotificationPriority,
  NotificationSettings,
  NotificationType,
} from "@/types/notifications";

export const OLD_DEBT_THRESHOLDS_DAYS = [7, 30, 90] as const;
export const DEFAULT_OLD_CUSTOMER_DEBT_DAYS = 30;
export const DEFAULT_SUPPLIER_DEBT_DAYS = 7;
export const DEFAULT_DEBT_ALERT_THRESHOLD = 100_000;
export const NOTIFICATION_RETENTION_DAYS = 90;

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  low_stock: "Stock faible",
  out_of_stock: "Rupture de stock",
  customer_debt: "Dette client",
  old_customer_debt: "Dette ancienne",
  supplier_debt: "Dette fournisseur",
  sale_completed: "Vente",
  purchase_completed: "Achat",
  payment_received: "Paiement",
  system: "Système",
};

export const PRIORITY_LABELS: Record<NotificationPriority, "Critique" | "Important" | "Information"> = {
  critical: "Critique",
  high: "Important",
  medium: "Information",
  low: "Information",
};

export function isNotificationType(value: string): value is NotificationType {
  return value in NOTIFICATION_TYPE_LABELS;
}

export function stockAlertKind(stock: number, minimumStock: number): "out_of_stock" | "low_stock" | null {
  if (stock <= 0) {
    return "out_of_stock";
  }

  if (stock <= minimumStock) {
    return "low_stock";
  }

  return null;
}

export function shouldCreateAlert(hasUnresolved: boolean) {
  return !hasUnresolved;
}

export function isDebtOverThreshold(due: number, threshold = DEFAULT_DEBT_ALERT_THRESHOLD) {
  return due >= threshold;
}

export function isOldDebt(ageDays: number, thresholdDays = DEFAULT_OLD_CUSTOMER_DEBT_DAYS) {
  return ageDays >= thresholdDays;
}

export function notificationPriority(type: NotificationType): NotificationPriority {
  if (type === "out_of_stock") {
    return "critical";
  }

  if (type === "old_customer_debt" || type === "customer_debt" || type === "supplier_debt") {
    return "high";
  }

  if (type === "low_stock" || type === "purchase_completed" || type === "payment_received") {
    return "medium";
  }

  return "low";
}

export function canReceiveNotification(role: BusinessRole, type: NotificationType) {
  if (type === "sale_completed") {
    return role === "owner" || role === "manager" || role === "cashier" || role === "seller";
  }

  if (type === "payment_received") {
    return role === "owner" || role === "manager" || role === "cashier";
  }

  if (type === "low_stock" || type === "out_of_stock" || type === "purchase_completed" || type === "supplier_debt") {
    return role === "owner" || role === "manager" || role === "stock_manager";
  }

  return role === "owner" || role === "manager";
}

export function isSettingEnabled(settings: Omit<NotificationSettings, "id" | "businessId" | "userId" | "customerDebtAlertThreshold">, type: NotificationType) {
  if (type === "low_stock") return settings.lowStock;
  if (type === "out_of_stock") return settings.outOfStock;
  if (type === "customer_debt") return settings.customerDebt;
  if (type === "old_customer_debt") return settings.oldCustomerDebt;
  if (type === "supplier_debt") return settings.supplierDebt;
  if (type === "sale_completed") return settings.saleCompleted;
  if (type === "purchase_completed") return settings.purchaseCompleted;
  if (type === "payment_received") return settings.paymentReceived;
  return true;
}

export function notificationHref(input: {
  type: NotificationType;
  entityType: NotificationEntityType | null;
  entityId: string | null;
}) {
  if (!input.entityId) {
    return "/notifications";
  }

  if (input.type === "low_stock" || input.type === "out_of_stock" || input.entityType === "product") {
    return `/products/${input.entityId}`;
  }

  if (input.type === "customer_debt" || input.type === "old_customer_debt" || input.entityType === "customer") {
    return `/customers/${input.entityId}`;
  }

  if (input.type === "supplier_debt" || input.entityType === "supplier") {
    return `/suppliers/${input.entityId}`;
  }

  if (input.type === "sale_completed" || input.type === "payment_received" || input.entityType === "sale") {
    return `/sales/${input.entityId}`;
  }

  if (input.type === "purchase_completed" || input.entityType === "purchase") {
    return `/purchases/${input.entityId}`;
  }

  return "/notifications";
}

export function restockHref(productId: string) {
  return `/purchases/new?product=${productId}`;
}
