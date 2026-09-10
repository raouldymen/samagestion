import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { requirePermission } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function SuppliersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("suppliers.view");
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
