import { AppShell } from "@/components/layout/app-shell";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";
import { BusinessProvider } from "@/components/providers/business-provider";
import { requireBusinessSession } from "@/lib/auth/session";
import {
  getUnreadNotificationCount,
  listLatestNotifications,
} from "@/lib/notifications/queries";

export async function AuthenticatedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, unreadCount, latest] = await Promise.all([
    requireBusinessSession(),
    getUnreadNotificationCount(),
    listLatestNotifications(),
  ]);

  return (
    <BusinessProvider value={session}>
      <NotificationsProvider unreadCount={unreadCount} latest={latest}>
        <AppShell>{children}</AppShell>
      </NotificationsProvider>
    </BusinessProvider>
  );
}
