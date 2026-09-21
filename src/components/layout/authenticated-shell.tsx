import { AppShell } from "@/components/layout/app-shell";
import { NotificationsProvider } from "@/components/notifications/notifications-provider";
import { BusinessProvider } from "@/components/providers/business-provider";
import { requireBusinessSession } from "@/lib/auth/session";
import {
  getUnreadNotificationCount,
  listLatestNotifications,
} from "@/lib/notifications/queries";
import { isCashierCheckoutRequired } from "@/lib/sales/queries";

export async function AuthenticatedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, unreadCount, latest, hasActiveCashier] = await Promise.all([
    requireBusinessSession(),
    getUnreadNotificationCount(),
    listLatestNotifications(),
    isCashierCheckoutRequired(),
  ]);

  return (
    <BusinessProvider value={{ ...session, hasActiveCashier }}>
      <NotificationsProvider unreadCount={unreadCount} latest={latest}>
        <AppShell>{children}</AppShell>
      </NotificationsProvider>
    </BusinessProvider>
  );
}
