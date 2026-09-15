import type { Metadata } from "next";
import { NotificationSettingsForm } from "@/components/notifications/notification-settings";
import { PageHeader } from "@/components/ui/page-header";
import { requireBusinessSession } from "@/lib/auth/session";
import { getNotificationSettings } from "@/lib/notifications/queries";

export const metadata: Metadata = {
  title: "Préférences de notifications",
};

export default async function NotificationSettingsPage() {
  const session = await requireBusinessSession();
  const settings = await getNotificationSettings();

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Choisissez les alertes que vous souhaitez recevoir dans l'application."
      />
      <NotificationSettingsForm settings={settings} role={session.role} />
    </>
  );
}
