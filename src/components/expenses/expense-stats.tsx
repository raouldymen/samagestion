import { CalendarDays, CalendarRange, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { ExpenseStats } from "@/types/expenses";

export function ExpenseStatsCards({ stats }: { stats: ExpenseStats }) {
  const items = [
    { label: "Aujourd'hui", value: stats.today, icon: CalendarDays },
    { label: "Cette semaine", value: stats.week, icon: CalendarRange },
    { label: "Ce mois", value: stats.month, icon: CalendarRange },
    { label: "Total", value: stats.total, icon: Wallet },
  ];

  return (
    <section aria-label="Statistiques des dépenses" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Card key={item.label} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl">
                {formatFcfaAbsolute(item.value)}
              </p>
            </div>
            <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
          </Card>
        );
      })}
    </section>
  );
}
