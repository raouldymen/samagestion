import type { Metadata } from "next";
import { PreferencesSettings } from "@/components/settings/preferences-settings";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/auth/permissions";
import { getBusinessSettings } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Préférences",
};

export default async function PreferencesPage() {
  const session = await requirePermission("settings.view");
  const settings = await getBusinessSettings();

  return (
    <>
      <PageHeader
        title="Préférences"
        description="Langue, formats et fuseau horaire du commerce."
      />
      <PreferencesSettings settings={settings} canEdit={hasPermission(session.role, "settings.edit")} />
    </>
  );
}
