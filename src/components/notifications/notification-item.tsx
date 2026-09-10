import Link from "next/link";
import { NotificationBadge } from "@/components/notifications/notification-badge";
import {
  deleteNotificationAction,
  openNotificationAction,
} from "@/lib/notifications/actions";
import { NOTIFICATION_TYPE_LABELS, restockHref } from "@/lib/notifications/rules";
import { formatRelativeTime } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { AppNotification } from "@/types/notifications";

export function NotificationItem({
  notification,
  compact = false,
}: {
  notification: AppNotification;
  compact?: boolean;
}) {
  const restock =
    (notification.type === "low_stock" || notification.type === "out_of_stock") &&
    notification.entityId
      ? restockHref(notification.entityId)
      : null;
  const customerId =
    (notification.type === "customer_debt" || notification.type === "old_customer_debt") &&
    notification.entityId
      ? notification.entityId
      : null;
  const supplierId =
    notification.type === "supplier_debt" && notification.entityId ? notification.entityId : null;

  return (
    <article
      className={cn(
        "rounded-xl border border-border p-3",
        !notification.isRead && "bg-primary-soft/40",
      )}
    >
      <form action={openNotificationAction}>
        <input type="hidden" name="notificationId" value={notification.id} />
        <button type="submit" className="w-full text-left">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold">{NOTIFICATION_TYPE_LABELS[notification.type]}</p>
            <div className="flex shrink-0 items-center gap-2">
              <NotificationBadge priority={notification.priority} />
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(notification.createdAt)}
              </span>
            </div>
          </div>
          <p className="mt-1 text-sm text-foreground">{notification.title}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{notification.message}</p>
        </button>
      </form>
      {compact ? null : (
        <div className="mt-3 flex flex-wrap gap-2">
          {restock ? (
            <Link
              href={restock}
              className="rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary"
            >
              Réapprovisionner
            </Link>
          ) : null}
          {customerId ? (
            <>
              <Link
                href={`/customers/${customerId}`}
                className="rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary"
              >
                Voir client
              </Link>
              <Link
                href="/sales/new"
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium"
              >
                Enregistrer paiement
              </Link>
            </>
          ) : null}
          {supplierId ? (
            <Link
              href={`/suppliers/${supplierId}`}
              className="rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-medium text-primary"
            >
              Voir fournisseur
            </Link>
          ) : null}
          <form action={deleteNotificationAction}>
            <input type="hidden" name="notificationId" value={notification.id} />
            <button type="submit" className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
              Supprimer
            </button>
          </form>
        </div>
      )}
    </article>
  );
}
