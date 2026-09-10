import { Package, PackageCheck, TriangleAlert, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { ProductStats } from "@/types/products";

export function ProductStats({ stats }: { stats: ProductStats }) {
  const items = [
    {
      label: "Total produits",
      value: String(stats.total),
      icon: Package,
    },
    {
      label: "Produits actifs",
      value: String(stats.active),
      icon: PackageCheck,
    },
    {
      label: "Stock faible",
      value: String(stats.lowStock),
      icon: TriangleAlert,
    },
    {
      label: "Valeur du stock",
      value: formatFcfaAbsolute(stats.stockValue),
      icon: Wallet,
    },
  ];

  return (
    <section
      aria-label="Statistiques produits"
      className="grid grid-cols-2 gap-3 lg:grid-cols-4"
    >
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
