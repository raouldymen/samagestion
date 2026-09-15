import type { Metadata } from "next";
import { SettingsNav } from "@/components/settings/settings-nav";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/access";

export const metadata: Metadata = {
  title: "Paramètres",
};

export default async function SettingsPage() {
  const session = await requirePermission("settings.view");

  return (
    <>
      <PageHeader
        title="Paramètres"
        description="Configurez votre commerce, vos reçus et vos préférences."
      />
      <SettingsNav role={session.role} />
    </>
  );
}
