import { CalendarDays, CalendarRange, Truck, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { PurchaseStats } from "@/types/purchases";

export function PurchaseStatsCards({ stats }: { stats: PurchaseStats }) {
  const items = [
    { label: "Achats aujourd'hui", value: formatFcfaAbsolute(stats.today), icon: CalendarDays },
    { label: "Achats ce mois", value: formatFcfaAbsolute(stats.month), icon: CalendarRange },
    { label: "Montant des achats", value: formatFcfaAbsolute(stats.total), icon: Wallet },
    { label: "Fournisseurs", value: String(stats.suppliersCount), icon: Truck },
  ];

  return (
    <section aria-label="Statistiques des achats" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Card key={item.label} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-1 truncate text-lg font-semibold tracking-tight sm:text-xl">
                {item.value}
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
