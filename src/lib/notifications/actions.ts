"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canViewFinancialReports } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { getNotification } from "@/lib/notifications/queries";
import { notificationHref } from "@/lib/notifications/rules";
import { createClient } from "@/lib/supabase/server";
import type { AuthResult } from "@/types";

function revalidateNotifications() {
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  revalidatePath("/settings/notifications");
  revalidatePath("/", "layout");
}

export async function markNotificationReadAction(notificationId: string): Promise<AuthResult> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("business_id", session.businessId)
    .eq("user_id", session.user.id);

  if (error) {
    return { error: "Impossible de marquer la notification comme lue." };
  }

  revalidateNotifications();
  return { error: null, success: true };
}

export async function openNotificationAction(formData: FormData) {
  const session = await requireBusinessSession();
  const id = String(formData.get("notificationId") ?? "");
  const notification = await getNotification(id);

  if (!notification) {
    redirect("/notifications");
  }

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id)
    .eq("business_id", session.businessId)
    .eq("user_id", session.user.id);

  revalidateNotifications();
  redirect(notificationHref(notification));
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("business_id", session.businessId)
    .eq("user_id", session.user.id)
    .eq("is_read", false);

  revalidateNotifications();
}

export async function deleteNotificationAction(formData: FormData): Promise<void> {
  const session = await requireBusinessSession();
  const id = String(formData.get("notificationId") ?? "");
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("business_id", session.businessId)
    .eq("user_id", session.user.id);

  revalidateNotifications();
}

export async function deleteReadNotificationsAction(): Promise<void> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .delete()
    .eq("business_id", session.businessId)
    .eq("user_id", session.user.id)
    .eq("is_read", true);

  revalidateNotifications();
}

export async function updateNotificationSettingsAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const enabled = (key: string) => formData.get(key) === "on";

  const { error } = await supabase.rpc("update_notification_settings", {
    p_low_stock: enabled("lowStock"),
    p_out_of_stock: enabled("outOfStock"),
    p_customer_debt: enabled("customerDebt"),
    p_old_customer_debt: enabled("oldCustomerDebt"),
    p_supplier_debt: enabled("supplierDebt"),
    p_sale_completed: enabled("saleCompleted"),
    p_purchase_completed: enabled("purchaseCompleted"),
    p_payment_received: enabled("paymentReceived"),
  });

  if (error) {
    return { error: "Impossible d'enregistrer les préférences." };
  }

  if (canViewFinancialReports(session.role)) {
    const threshold = Number(formData.get("customerDebtAlertThreshold") ?? "");
    if (Number.isFinite(threshold) && threshold >= 0) {
      await supabase.rpc("update_customer_debt_alert_threshold", { p_threshold: threshold });
    }
  }

  revalidateNotifications();
  return { error: null, success: true, message: "Préférences enregistrées." };
}
