import { requireReportsPage } from "@/lib/reports/access";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireReportsPage();
  return children;
}
