import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { requirePermission } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function CustomersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("customers.view");
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
