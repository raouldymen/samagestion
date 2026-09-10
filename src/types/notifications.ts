export const NOTIFICATION_TYPES = [
  "low_stock",
  "out_of_stock",
  "customer_debt",
  "old_customer_debt",
  "supplier_debt",
  "sale_completed",
  "purchase_completed",
  "payment_received",
  "system",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_PRIORITIES = ["critical", "high", "medium", "low"] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export const NOTIFICATION_CHANNELS = ["in_app", "email", "sms", "whatsapp", "push"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export type NotificationEntityType = "product" | "customer" | "supplier" | "sale" | "purchase";

export type AppNotification = {
  id: string;
  businessId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType: NotificationEntityType | null;
  entityId: string | null;
  priority: NotificationPriority;
  channel: NotificationChannel;
  isRead: boolean;
  isResolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
};

export type NotificationSettings = {
  id: string;
  businessId: string;
  userId: string;
  lowStock: boolean;
  outOfStock: boolean;
  customerDebt: boolean;
  oldCustomerDebt: boolean;
  supplierDebt: boolean;
  saleCompleted: boolean;
  purchaseCompleted: boolean;
  paymentReceived: boolean;
  customerDebtAlertThreshold: number;
};

export type NotificationFilter = "all" | "unread";

export type DashboardAlerts = {
  outOfStock: number;
  lowStock: number;
  customerDebts: number;
};
