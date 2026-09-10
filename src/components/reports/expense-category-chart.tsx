import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFcfaAbsolute, formatPercent } from "@/lib/utils/format";
import type { ReportsBundle } from "@/types/reports";

export function ExpenseCategoryChart({ bundle }: { bundle: ReportsBundle }) {
  const max = Math.max(0, ...bundle.expenseCategories.map((item) => item.amount));

  return (
    <section aria-labelledby="expense-category-title">
      <Card>
        <CardHeader>
          <CardTitle id="expense-category-title">Répartition des dépenses</CardTitle>
        </CardHeader>
        {bundle.expenseCategories.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune dépense catégorisée sur cette période.</p>
        ) : (
          <ul className="space-y-3">
            {bundle.expenseCategories.map((item) => {
              const width = max === 0 ? 0 : Math.max(4, Math.round((item.amount / max) * 100));

              return (
                <li key={item.name}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <p className="font-medium">{item.name}</p>
                    <p className="shrink-0 text-muted-foreground">
                      {formatFcfaAbsolute(item.amount)} · {formatPercent(item.percent)}
                    </p>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
