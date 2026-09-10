import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFcfaAbsolute, formatPercent } from "@/lib/utils/format";
import type { ReportsBundle } from "@/types/reports";

export function ProfitAnalysis({ bundle }: { bundle: ReportsBundle }) {
  const { current, marginRate, profitRate } = bundle;

  return (
    <section aria-labelledby="profit-analysis-title">
      <Card>
        <CardHeader>
          <CardTitle id="profit-analysis-title">Marge et bénéfice</CardTitle>
        </CardHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Marge brute</p>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Chiffre d&apos;affaires</dt>
                <dd className="font-medium">{formatFcfaAbsolute(current.revenue)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Coût des marchandises</dt>
                <dd className="font-medium">{formatFcfaAbsolute(current.cogs)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-1.5">
                <dt>Marge brute</dt>
                <dd className="font-semibold">{formatFcfaAbsolute(current.grossMargin)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Taux de marge</dt>
                <dd className="font-medium">{formatPercent(marginRate)}</dd>
              </div>
            </dl>
          </div>
          <div>
            <p className="text-sm font-medium">Bénéfice net</p>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Marge brute</dt>
                <dd className="font-medium">{formatFcfaAbsolute(current.grossMargin)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Dépenses</dt>
                <dd className="font-medium">{formatFcfaAbsolute(current.expenses)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-1.5">
                <dt>Bénéfice net</dt>
                <dd className="font-semibold">{formatFcfaAbsolute(current.netProfit)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Taux de bénéfice</dt>
                <dd className="font-medium">{formatPercent(profitRate)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              Les achats de stock ne sont pas déduits des dépenses opérationnelles.
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}
