import { requirePermission } from "@/lib/auth/access";

export default async function ExpensesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("expenses.view");
  return children;
}
