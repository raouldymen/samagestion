import type { Metadata } from "next";
import { ReceiptSettings } from "@/components/settings/receipt-settings";
import { PageHeader } from "@/components/ui/page-header";
import { requireSettingsSection } from "@/lib/settings/access";
import { hasPermission } from "@/lib/auth/permissions";
import { getBusinessSettings } from "@/lib/settings/queries";

export const metadata: Metadata = {
  title: "Reçus",
};

export default async function ReceiptSettingsPage() {
  const session = await requireSettingsSection("receipts");
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
