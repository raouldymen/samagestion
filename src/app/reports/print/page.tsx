import type { Metadata } from "next";
import { ReportExportActions } from "@/components/reports/report-export-actions";
import { ReportsContent } from "@/components/reports/reports-content";
import { parseReportSearch } from "@/lib/reports/params";
import { getReportsBundle } from "@/lib/reports/queries";
import { requireReportsPage } from "@/lib/reports/access";

export const metadata: Metadata = {
  title: "Rapport d'activité",
};

type SearchParams = Promise<{
  period?: string;
  from?: string;
  to?: string;
}>;

export default async function ReportsPrintPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await requireReportsPage();
  const params = await searchParams;
  const { period, from, to } = parseReportSearch(params);
  const bundle = await getReportsBundle(period, from, to);

  return (
    <>
      <div className="mb-6 print:hidden">
        <ReportExportActions period={period} from={from} to={to} />
      </div>
      <ReportsContent bundle={bundle} businessName={session.business.name} printDocument />
    </>
  );
}
