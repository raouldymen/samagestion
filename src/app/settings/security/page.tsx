import type { Metadata } from "next";
import { SecuritySettings } from "@/components/settings/security-settings";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth/access";

export const metadata: Metadata = {
  title: "Sécurité",
};

export default async function SecuritySettingsPage() {
  await requirePermission("settings.view");

  return (
    <>
      <PageHeader title="Sécurité" description="Protégez l'accès à votre compte." />
      <SecuritySettings />
    </>
  );
}
