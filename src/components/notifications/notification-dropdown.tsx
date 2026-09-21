"use client";

import Link from "next/link";
import { NotificationEmptyState } from "@/components/notifications/notification-empty-state";
import { NotificationItem } from "@/components/notifications/notification-item";
import { useNotifications } from "@/components/notifications/notifications-provider";
import { markAllNotificationsReadAction } from "@/lib/notifications/actions";

export function NotificationDropdown({ onNavigate }: { onNavigate?: () => void }) {
  const { latest, unreadCount } = useNotifications();

  return (
    <div className="w-full lg:w-[min(28rem,calc(100vw-1rem))] rounded-xl border border-border bg-card p-3 shadow-lg">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Notifications</p>
        {unreadCount > 0 ? (
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="text-xs font-medium text-primary hover:underline">
              Tout marquer comme lu
            </button>
          </form>
        ) : null}
      </div>
      {latest.length === 0 ? (
        <NotificationEmptyState />
      ) : (
        <div className="flex max-h-[calc(100dvh-11rem-env(safe-area-inset-top))] flex-col gap-2 overflow-y-auto overscroll-contain lg:max-h-[calc(100dvh-8rem)]">
          {latest.map((notification) => (
            <NotificationItem key={notification.id} notification={notification} compact />
          ))}
        </div>
      )}
      <Link
        href="/notifications"
        onClick={onNavigate}
        className="mt-3 block rounded-lg px-2 py-2 text-center text-sm font-medium text-primary hover:bg-primary-soft"
      >
        Voir toutes les notifications
      </Link>
    </div>
  );
}
