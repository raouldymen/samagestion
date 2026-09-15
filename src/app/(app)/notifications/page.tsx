import type { Metadata } from "next";
import { NotificationFilters } from "@/components/notifications/notification-filters";
import { NotificationList } from "@/components/notifications/notification-list";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  deleteReadNotificationsAction,
  markAllNotificationsReadAction,
} from "@/lib/notifications/actions";
import { listNotifications } from "@/lib/notifications/queries";
import type { NotificationFilter } from "@/types/notifications";

export const metadata: Metadata = {
  title: "Notifications",
};

type SearchParams = Promise<{ filter?: string }>;

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const filter: NotificationFilter = params.filter === "unread" ? "unread" : "all";
  const notifications = await listNotifications(filter);

  return (
    <>
      <div className="mb-5 lg:hidden">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Toutes vos alertes importantes au même endroit.
        </p>
      </div>
      <div className="hidden lg:block">
        <PageHeader
          title="Notifications"
          description="Toutes vos alertes importantes au même endroit."
        />
      </div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <NotificationFilters filter={filter} />
        <div className="flex flex-wrap gap-2">
          <form action={markAllNotificationsReadAction}>
            <Button type="submit" variant="outline" size="sm">
              Tout marquer comme lu
            </Button>
          </form>
          <form action={deleteReadNotificationsAction}>
            <Button type="submit" variant="ghost" size="sm">
              Effacer les notifications lues
            </Button>
          </form>
        </div>
      </div>
      <NotificationList notifications={notifications} />
    </>
  );
}
