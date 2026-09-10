import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { requireReportsPage } from "@/lib/reports/access";

export const dynamic = "force-dynamic";

export default async function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireReportsPage();
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
