"use client";

import { createContext, useContext } from "react";
import type { AppNotification } from "@/types/notifications";

type NotificationsContextValue = {
  unreadCount: number;
  latest: AppNotification[];
};

const NotificationsContext = createContext<NotificationsContextValue>({
  unreadCount: 0,
  latest: [],
});

export function NotificationsProvider({
  unreadCount,
  latest,
  children,
}: NotificationsContextValue & { children: React.ReactNode }) {
  return (
    <NotificationsContext.Provider value={{ unreadCount, latest }}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationsContext);
}
