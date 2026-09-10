import type { Metadata } from "next";
import { ReportExportActions } from "@/components/reports/report-export-actions";
import { ReportPeriodSelector } from "@/components/reports/report-period-selector";
import { ReportsContent } from "@/components/reports/reports-content";
import { PageHeader } from "@/components/ui/page-header";
import { parseReportSearch } from "@/lib/reports/params";
import { formatPeriodLabel } from "@/lib/reports/period";
import { getReportsBundle } from "@/lib/reports/queries";
import { requireReportsPage } from "@/lib/reports/access";

export const metadata: Metadata = {
  title: "Rapports & analyses",
};

type SearchParams = Promise<{
  period?: string;
  from?: string;
  to?: string;
}>;

export default async function ReportsPage({
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
      <div className="print:hidden">
        <div className="mb-5 lg:hidden">
          <h1 className="text-2xl font-semibold tracking-tight">Rapports &amp; analyses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Analysez les performances de votre activité.
          </p>
        </div>
        <div className="hidden lg:block">
          <PageHeader
            title="Rapports & analyses"
            description="Analysez les performances de votre activité."
            actions={<ReportExportActions period={period} from={from} to={to} />}
          />
        </div>
        <p className="mb-3 text-sm text-muted-foreground">Période : {formatPeriodLabel(bundle.range)}</p>
        <div className="mb-4 lg:mb-6">
          <ReportPeriodSelector period={period} from={from} to={to} />
        </div>
      </div>
      <ReportsContent bundle={bundle} businessName={session.business.name} />
      <div className="mt-6 lg:hidden">
        <ReportExportActions period={period} from={from} to={to} />
      </div>
    </>
  );
}
