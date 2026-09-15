import { requirePermission } from "@/lib/auth/access";

export default async function CustomersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("customers.view");
  return children;
}
