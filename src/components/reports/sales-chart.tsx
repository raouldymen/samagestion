import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { ChartGranularity, ReportSeriesPoint } from "@/types/reports";

const GRANULARITY_LABEL: Record<ChartGranularity, string> = {
  day: "par jour",
  week: "par semaine",
  month: "par mois",
};

export function SalesChart({
  series,
  granularity,
}: {
  series: ReportSeriesPoint[];
  granularity: ChartGranularity;
}) {
  const max = Math.max(0, ...series.map((item) => item.revenue));
  const labelEvery = series.length > 14 ? Math.ceil(series.length / 8) : 1;

  return (
    <section aria-labelledby="sales-chart-title">
      <Card>
        <CardHeader>
          <CardTitle id="sales-chart-title">Évolution du chiffre d&apos;affaires</CardTitle>
        </CardHeader>
        {series.length === 0 || max === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune vente sur cette période.</p>
        ) : (
          <div className="flex h-44 items-end gap-1 overflow-x-auto sm:h-52 sm:gap-1.5">
            {series.map((item, index) => {
              const height = Math.max(4, Math.round((item.revenue / max) * 100));
              const showLabel = index % labelEvery === 0 || index === series.length - 1;

              return (
                <div key={item.bucket} className="flex min-w-2 flex-1 flex-col items-center gap-1.5 sm:min-w-3">
                  <div className="flex h-32 w-full items-end sm:h-36">
                    <div
                      className="w-full rounded-t-md bg-primary"
                      style={{ height: `${height}%` }}
                      title={`${item.label} · ${formatFcfaAbsolute(item.revenue)}`}
                    />
                  </div>
                  <p className="h-8 text-center text-[10px] leading-tight font-medium text-muted-foreground sm:text-[11px]">
                    {showLabel ? item.label : ""}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">CA {GRANULARITY_LABEL[granularity]}</p>
      </Card>
    </section>
  );
}
