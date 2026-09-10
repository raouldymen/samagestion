import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFcfaAbsolute, formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { ReportsBundle } from "@/types/reports";

export function FinancialSummary({ bundle }: { bundle: ReportsBundle }) {
  const { current, revenueTrend, marginRate, profitRate } = bundle;
  const items = [
    { label: "CA", value: formatFcfaAbsolute(current.revenue) },
    { label: "Coût", value: formatFcfaAbsolute(current.cogs) },
    { label: "Marge", value: formatFcfaAbsolute(current.grossMargin) },
    { label: "Dépenses", value: formatFcfaAbsolute(current.expenses) },
    { label: "Bénéfice", value: formatFcfaAbsolute(current.netProfit) },
  ];

  return (
    <section aria-labelledby="financial-summary-title">
      <Card>
        <CardHeader>
          <CardTitle id="financial-summary-title">Résumé financier</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((item) => (
            <div key={item.label} className="min-w-0">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl">
                {item.value}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Taux de marge</span>{" "}
              <span className="font-semibold">{formatPercent(marginRate)}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Taux de bénéfice</span>{" "}
              <span className="font-semibold">{formatPercent(profitRate)}</span>
            </p>
          </div>
          <p
            className={cn(
              "flex items-center gap-1 text-sm font-medium",
              revenueTrend.direction === "up" && "text-success",
              revenueTrend.direction === "down" && "text-danger",
              (revenueTrend.direction === "flat" || revenueTrend.direction === "new") &&
                "text-muted-foreground",
            )}
          >
            {revenueTrend.direction === "up" ? <ArrowUpRight className="size-4" aria-hidden="true" /> : null}
            {revenueTrend.direction === "down" ? (
              <ArrowDownRight className="size-4" aria-hidden="true" />
            ) : null}
            {revenueTrend.direction === "flat" ? <Minus className="size-4" aria-hidden="true" /> : null}
            {revenueTrend.direction === "new" ? <Sparkles className="size-4" aria-hidden="true" /> : null}
            <span>
              {revenueTrend.label}
              <span className="ml-1 font-normal text-muted-foreground">vs période précédente</span>
            </span>
          </p>
        </div>
      </Card>
    </section>
  );
}
