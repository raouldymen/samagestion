import type { Metadata } from "next";
import { ReceiptSettings } from "@/components/settings/receipt-settings";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/access";
import { hasPermission } from "@/lib/auth/permissions";
import { getBusinessSettings } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Reçus",
};

export default async function ReceiptSettingsPage() {
  const session = await requirePermission("settings.view");
  const settings = await getBusinessSettings();

  return (
    <>
      <PageHeader
        title="Reçus"
        description="Personnalisez le reçu, la numérotation et le format d'impression."
      />
      <ReceiptSettings settings={settings} canEdit={hasPermission(session.role, "settings.edit")} />
    </>
  );
}
