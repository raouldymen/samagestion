import { requirePermission } from "@/lib/auth/access";

export default async function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("products.view");
  return children;
}
