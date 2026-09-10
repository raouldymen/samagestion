import { cache } from "react";
import { requireBusinessSession } from "@/lib/auth/session";
import { isNotificationType, notificationPriority } from "@/lib/notifications/rules";
import { createClient } from "@/lib/supabase/server";
import type {
  AppNotification,
  DashboardAlerts,
  NotificationChannel,
  NotificationEntityType,
  NotificationFilter,
  NotificationPriority,
  NotificationSettings,
  NotificationType,
} from "@/types/notifications";

const LIST_LIMIT = 50;
const DROPDOWN_LIMIT = 8;

function asNumber(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function asType(value: string): NotificationType {
  return isNotificationType(value) ? value : "system";
}

function asPriority(value: string): NotificationPriority {
  if (value === "critical" || value === "high" || value === "medium" || value === "low") {
    return value;
  }

  return notificationPriority(asType(value));
}

function asChannel(value: string): NotificationChannel {
  if (value === "email" || value === "sms" || value === "whatsapp" || value === "push") {
    return value;
  }

  return "in_app";
}

function asEntityType(value: string | null): NotificationEntityType | null {
  if (
    value === "product" ||
    value === "customer" ||
    value === "supplier" ||
    value === "sale" ||
    value === "purchase"
  ) {
    return value;
  }

  return null;
}

function mapNotification(row: {
  id: string;
  business_id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  priority: string;
  channel: string;
  is_read: boolean;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}): AppNotification {
  return {
    id: row.id,
    businessId: row.business_id,
    userId: row.user_id,
    type: asType(row.type),
    title: row.title,
    message: row.message,
    entityType: asEntityType(row.entity_type),
    entityId: row.entity_id,
    priority: asPriority(row.priority),
    channel: asChannel(row.channel),
    isRead: row.is_read,
    isResolved: row.is_resolved,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

export async function syncBusinessAlerts() {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  await supabase.rpc("sync_business_alerts");
  return session.businessId;
}

const syncOnce = cache(syncBusinessAlerts);

export async function createNotification(input: {
  type: NotificationType;
  title: string;
  message: string;
  entityType?: NotificationEntityType | null;
  entityId?: string | null;
  priority?: NotificationPriority;
}) {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_in_app_notification", {
    p_business_id: session.businessId,
    p_type: input.type,
    p_title: input.title,
    p_message: input.message,
    p_entity_type: input.entityType ?? null,
    p_entity_id: input.entityId ?? null,
    p_priority: input.priority ?? notificationPriority(input.type),
  });

  if (error) {
    return 0;
  }

  return asNumber(data);
}

export async function createStockAlert(productId: string) {
  await requireBusinessSession();
  const supabase = await createClient();
  await supabase.rpc("create_stock_alert", { p_product_id: productId });
}

export async function createCustomerDebtAlert(customerId: string) {
  await requireBusinessSession();
  const supabase = await createClient();
  await supabase.rpc("create_customer_debt_alert", { p_customer_id: customerId });
}

export async function createSupplierDebtAlert(supplierId: string) {
  await requireBusinessSession();
  const supabase = await createClient();
  await supabase.rpc("create_supplier_debt_alert", { p_supplier_id: supplierId });
}

export async function listNotifications(filter: NotificationFilter = "all") {
  const session = await requireBusinessSession();
  await syncOnce();
  const supabase = await createClient();
  let query = supabase
    .from("notifications")
    .select(
      "id, business_id, user_id, type, title, message, entity_type, entity_id, priority, channel, is_read, is_resolved, resolved_at, created_at",
    )
    .eq("business_id", session.businessId)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(LIST_LIMIT);

  if (filter === "unread") {
    query = query.eq("is_read", false);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map(mapNotification);
}

export async function listLatestNotifications() {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, business_id, user_id, type, title, message, entity_type, entity_id, priority, channel, is_read, is_resolved, resolved_at, created_at",
    )
    .eq("business_id", session.businessId)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(DROPDOWN_LIMIT);

  if (error || !data) {
    return [];
  }

  return data.map(mapNotification);
}

export async function getUnreadNotificationCount() {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("business_id", session.businessId)
    .eq("user_id", session.user.id)
    .eq("is_read", false);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export async function getNotification(id: string) {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, business_id, user_id, type, title, message, entity_type, entity_id, priority, channel, is_read, is_resolved, resolved_at, created_at",
    )
    .eq("id", id)
    .eq("business_id", session.businessId)
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapNotification(data);
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  await supabase.rpc("ensure_notification_settings", {
    p_business_id: session.businessId,
    p_user_id: session.user.id,
  });

  const [{ data: settings }, { data: business }] = await Promise.all([
    supabase
      .from("notification_settings")
      .select(
        "id, business_id, user_id, low_stock, out_of_stock, customer_debt, old_customer_debt, supplier_debt, sale_completed, purchase_completed, payment_received",
      )
      .eq("business_id", session.businessId)
      .eq("user_id", session.user.id)
      .maybeSingle(),
    supabase
      .from("businesses")
      .select("customer_debt_alert_threshold")
      .eq("id", session.businessId)
      .maybeSingle(),
  ]);

  return {
    id: settings?.id ?? "",
    businessId: session.businessId,
    userId: session.user.id,
    lowStock: settings?.low_stock ?? true,
    outOfStock: settings?.out_of_stock ?? true,
    customerDebt: settings?.customer_debt ?? true,
    oldCustomerDebt: settings?.old_customer_debt ?? true,
    supplierDebt: settings?.supplier_debt ?? true,
    saleCompleted: settings?.sale_completed ?? false,
    purchaseCompleted: settings?.purchase_completed ?? true,
    paymentReceived: settings?.payment_received ?? true,
    customerDebtAlertThreshold: asNumber(business?.customer_debt_alert_threshold) || 100_000,
  };
}

export async function getDashboardAlerts(): Promise<DashboardAlerts> {
  const session = await requireBusinessSession();
  await syncOnce();
  const supabase = await createClient();

  if (session.role !== "owner" && session.role !== "manager") {
    const { data: products } = await supabase
      .from("products")
      .select("stock_status")
      .eq("business_id", session.businessId)
      .eq("is_active", true);

    return {
      outOfStock: (products ?? []).filter((item) => item.stock_status === "out").length,
      lowStock: (products ?? []).filter((item) => item.stock_status === "low").length,
      customerDebts: 0,
    };
  }

  const [{ data: products }, { data: settings }, { data: sales }] = await Promise.all([
    supabase
      .from("products")
      .select("stock_status")
      .eq("business_id", session.businessId)
      .eq("is_active", true),
    supabase
      .from("businesses")
      .select("customer_debt_alert_threshold")
      .eq("id", session.businessId)
      .maybeSingle(),
    supabase
      .from("sales")
      .select("customer_id, amount_due")
      .eq("business_id", session.businessId)
      .eq("status", "completed")
      .gt("amount_due", 0),
  ]);

  const threshold = asNumber(settings?.customer_debt_alert_threshold) || 100_000;
  const dueByCustomer = new Map<string, number>();

  for (const sale of sales ?? []) {
    if (!sale.customer_id) {
      continue;
    }

    dueByCustomer.set(sale.customer_id, (dueByCustomer.get(sale.customer_id) ?? 0) + asNumber(sale.amount_due));
  }

  return {
    outOfStock: (products ?? []).filter((item) => item.stock_status === "out").length,
    lowStock: (products ?? []).filter((item) => item.stock_status === "low").length,
    customerDebts: [...dueByCustomer.values()].filter((due) => due >= threshold).length,
  };
}
