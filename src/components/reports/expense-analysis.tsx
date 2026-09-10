import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { ChartGranularity, ReportsBundle } from "@/types/reports";

const GRANULARITY_LABEL: Record<ChartGranularity, string> = {
  day: "par jour",
  week: "par semaine",
  month: "par mois",
};

export function ExpenseAnalysis({ bundle }: { bundle: ReportsBundle }) {
  const max = Math.max(0, ...bundle.series.map((item) => Math.max(item.revenue, item.expenses)));
  const labelEvery = bundle.series.length > 14 ? Math.ceil(bundle.series.length / 8) : 1;
  const stats = [
    { label: "Dépenses totales", value: formatFcfaAbsolute(bundle.expenses.total) },
    { label: "Nombre de dépenses", value: String(bundle.expenses.count) },
    { label: "Dépense moyenne", value: formatFcfaAbsolute(bundle.expenses.average) },
  ];

  return (
    <section aria-labelledby="expense-analysis-title" className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle id="expense-analysis-title">Analyse des dépenses</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {stats.map((item) => (
            <div key={item.label}>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-lg font-semibold">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle id="expense-series-title">Évolution des dépenses</CardTitle>
        </CardHeader>
        {bundle.series.length === 0 || max === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune dépense sur cette période.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-primary" aria-hidden="true" />
                CA
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-slate-300" aria-hidden="true" />
                Dépenses
              </span>
            </div>
            <div className="flex h-44 items-end gap-1 overflow-x-auto sm:h-52 sm:gap-1.5">
              {bundle.series.map((item, index) => {
                const revenueHeight = item.revenue === 0 ? 0 : Math.max(4, Math.round((item.revenue / max) * 100));
                const expenseHeight = item.expenses === 0 ? 0 : Math.max(4, Math.round((item.expenses / max) * 100));
                const showLabel = index % labelEvery === 0 || index === bundle.series.length - 1;

                return (
                  <div key={item.bucket} className="flex min-w-4 flex-1 flex-col items-center gap-1.5 sm:min-w-5">
                    <div className="flex h-32 w-full items-end justify-center gap-px sm:h-36">
                      <div
                        className="w-1/2 rounded-t-sm bg-primary"
                        style={{ height: `${revenueHeight}%` }}
                        title={`CA · ${formatFcfaAbsolute(item.revenue)}`}
                      />
                      <div
                        className="w-1/2 rounded-t-sm bg-slate-300"
                        style={{ height: `${expenseHeight}%` }}
                        title={`Dépenses · ${formatFcfaAbsolute(item.expenses)}`}
                      />
                    </div>
                    <p className="h-8 text-center text-[10px] leading-tight font-medium text-muted-foreground sm:text-[11px]">
                      {showLabel ? item.label : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          CA vs dépenses {GRANULARITY_LABEL[bundle.range.granularity]}
        </p>
      </Card>
    </section>
  );
}
