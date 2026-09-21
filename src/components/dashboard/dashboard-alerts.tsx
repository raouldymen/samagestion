import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";

export function DashboardAlerts({
  outOfStock,
  lowStock,
  customerDebts,
}: {
  outOfStock: number;
  lowStock: number;
  customerDebts: number;
}) {
  const items = [
    {
      href: "/products?stock=out",
      label: `${outOfStock} rupture${outOfStock > 1 ? "s" : ""}`,
      count: outOfStock,
      tone: "text-danger",
      ariaLabel: "Voir les produits en rupture de stock",
    },
    {
      href: "/products?stock=low",
      label: `${lowStock} stock${lowStock > 1 ? "s" : ""} faible${lowStock > 1 ? "s" : ""}`,
      count: lowStock,
      tone: "text-amber-700",
      ariaLabel: "Voir les produits avec un stock faible",
    },
    {
      href: "/customers?debt=open",
      label: `${customerDebts} dette${customerDebts > 1 ? "s" : ""} importante${customerDebts > 1 ? "s" : ""}`,
      count: customerDebts,
      tone: "text-foreground",
      ariaLabel: "Voir les clients ayant une dette",
    },
  ];

  return (
    <section aria-labelledby="dashboard-alerts-title">
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="size-4 text-primary" aria-hidden="true" />
          <h2 id="dashboard-alerts-title" className="text-base font-semibold">
            Alertes
          </h2>
        </div>
        {items.every((item) => item.count === 0) ? (
          <p className="text-sm text-muted-foreground">Aucune alerte en cours.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-3">
            {items.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  aria-label={item.ariaLabel}
                  className={`block rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted ${item.tone}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
