"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { NotificationBadge } from "@/components/notifications/notification-badge";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { useNotifications } from "@/components/notifications/notifications-provider";

export function NotificationBell() {
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} non lues` : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex size-10 items-center justify-center rounded-lg text-slate-600 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="size-5" aria-hidden="true" />
        <NotificationBadge count={unreadCount} />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Fermer les notifications"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-full right-0 z-50 mt-2">
            <NotificationDropdown onNavigate={() => setOpen(false)} />
          </div>
        </>
      ) : null}
    </div>
  );
}
