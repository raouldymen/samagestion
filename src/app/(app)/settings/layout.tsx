import { requirePermission } from "@/lib/auth/access";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("settings.view");
  return children;
}
