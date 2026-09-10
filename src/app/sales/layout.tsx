import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { requirePermission } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("sales.view");
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
