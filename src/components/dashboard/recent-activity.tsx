import { ArrowDownRight, ArrowUpRight, Package } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatFcfa } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { DashboardActivity } from "@/types/dashboard";

export function RecentActivity({ items }: { items: DashboardActivity[] }) {
  return (
    <section aria-labelledby="recent-activity-title">
      <Card>
        <CardHeader>
          <CardTitle id="recent-activity-title">Activité récente</CardTitle>
        </CardHeader>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune activité récente.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const isStock = item.type === "stock";
              const isIncome = !isStock && item.amount >= 0;

              return (
                <li key={`${item.type}-${item.id}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    className={cn(
                      "inline-flex size-10 shrink-0 items-center justify-center rounded-full",
                      isStock
                        ? "bg-muted text-muted-foreground"
                        : isIncome
                          ? "bg-success-soft text-success"
                          : "bg-danger-soft text-danger",
                    )}
                  >
                    {isStock ? (
                      <Package className="size-4" aria-hidden="true" />
                    ) : isIncome ? (
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    ) : (
                      <ArrowDownRight className="size-4" aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(item.occurredAt)}</p>
                  </div>
                  {isStock ? null : (
                    <p
                      className={cn(
                        "shrink-0 text-sm font-semibold",
                        isIncome ? "text-success" : "text-danger",
                      )}
                    >
                      {formatFcfa(item.amount)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
