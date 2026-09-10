import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { requirePermission } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("products.view");
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
