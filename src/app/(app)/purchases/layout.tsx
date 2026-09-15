import { requirePermission } from "@/lib/auth/access";

export default async function PurchasesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("purchases.view");
  return children;
}
