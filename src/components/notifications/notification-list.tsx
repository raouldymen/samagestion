import { NotificationEmptyState } from "@/components/notifications/notification-empty-state";
import { NotificationItem } from "@/components/notifications/notification-item";
import type { AppNotification } from "@/types/notifications";

export function NotificationList({
  notifications,
  compact = false,
}: {
  notifications: AppNotification[];
  compact?: boolean;
}) {
  if (notifications.length === 0) {
    return <NotificationEmptyState />;
  }

  return (
    <div className="flex flex-col gap-3">
      {notifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} compact={compact} />
      ))}
    </div>
  );
}
