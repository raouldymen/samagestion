import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFcfaAbsolute } from "@/lib/utils/format";

export function RevenueChart({
  days,
}: {
  days: { day: string; revenue: number; label: string }[];
}) {
  const max = Math.max(0, ...days.map((item) => item.revenue));

  return (
    <section aria-labelledby="revenue-chart-title">
      <Card>
        <CardHeader>
          <CardTitle id="revenue-chart-title">Évolution du chiffre d&apos;affaires</CardTitle>
        </CardHeader>
        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune vente sur les 7 derniers jours.</p>
        ) : (
          <div className="flex h-44 items-end gap-2 sm:h-52">
            {days.map((item) => {
              const height = max === 0 ? 0 : Math.max(4, Math.round((item.revenue / max) * 100));

              return (
                <div key={item.day} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="flex h-32 w-full items-end sm:h-36">
                    <div
                      className="w-full rounded-t-md bg-primary"
                      style={{ height: `${height}%` }}
                      title={formatFcfaAbsolute(item.revenue)}
                    />
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">7 derniers jours · CA par jour</p>
      </Card>
    </section>
  );
}
