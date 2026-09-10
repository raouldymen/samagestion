import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { FinancialSummary as Summary } from "@/types/dashboard";

export function SalesReport({ current }: { current: Summary }) {
  const items = [
    { label: "Chiffre d'affaires", value: formatFcfaAbsolute(current.revenue) },
    {
      label: "Nombre de ventes",
      value: `${current.salesCount} vente${current.salesCount > 1 ? "s" : ""}`,
    },
    { label: "Panier moyen", value: formatFcfaAbsolute(current.avgBasket) },
    { label: "Montant encaissé", value: formatFcfaAbsolute(current.collected) },
    { label: "Créances", value: formatFcfaAbsolute(current.receivables) },
  ];

  return (
    <section aria-labelledby="sales-report-title">
      <Card>
        <CardHeader>
          <CardTitle id="sales-report-title">Rapport des ventes</CardTitle>
        </CardHeader>
        <p className="mb-4 text-xs text-muted-foreground">
          Le CA n&apos;est pas l&apos;argent encaissé : les créances restent dues par les clients.
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {items.map((item) => (
            <div key={item.label} className="min-w-0">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-1 truncate text-base font-semibold sm:text-lg">{item.value}</p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
