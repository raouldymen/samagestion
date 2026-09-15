import type { Metadata } from "next";
import { BusinessSettings } from "@/components/settings/business-settings";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/auth/permissions";
import { getBusinessSettings } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Commerce",
};

export default async function BusinessSettingsPage() {
  const session = await requirePermission("settings.view");
  const settings = await getBusinessSettings();

  return (
    <>
      <PageHeader
        title="Commerce"
        description="Informations affichées dans l'application et sur les reçus."
      />
      <BusinessSettings settings={settings} canEdit={hasPermission(session.role, "settings.edit")} />
    </>
  );
}
