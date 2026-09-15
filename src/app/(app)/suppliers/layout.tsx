import { requirePermission } from "@/lib/auth/access";

export default async function SuppliersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("suppliers.view");
  return children;
}
