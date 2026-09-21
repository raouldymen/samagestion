import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/access";
import { canAccessSettingsSection, type SettingsSection } from "@/lib/settings/sections";

export async function requireSettingsSection(section: SettingsSection) {
  const session = await requirePermission("settings.view");

  if (!canAccessSettingsSection(session.role, section)) {
    notFound();
  }

  return session;
}
