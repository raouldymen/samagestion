import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { ReportsBundle } from "@/types/reports";

export function CustomerDebtAnalysis({ bundle }: { bundle: ReportsBundle }) {
  const stats = [
    { label: "Nombre de clients", value: String(bundle.customers.total) },
    { label: "Nouveaux clients", value: String(bundle.customers.newCount) },
    { label: "Clients ayant acheté", value: String(bundle.customers.buyingCount) },
    { label: "Clients débiteurs", value: String(bundle.customers.debtorsCount) },
    { label: "Créances", value: formatFcfaAbsolute(bundle.customers.receivablesOpen) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="customers-analysis-title">
        <Card>
          <CardHeader>
            <CardTitle id="customers-analysis-title">Analyse clients</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {stats.map((item) => (
              <div key={item.label}>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-lg font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section aria-labelledby="debt-aging-title">
        <Card>
          <CardHeader>
            <CardTitle id="debt-aging-title">Créances clients</CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[20rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Ancienneté</th>
                  <th className="pb-2 pr-3 font-medium">Nombre</th>
                  <th className="pb-2 font-medium">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {bundle.aging.map((bucket) => (
                  <tr key={bucket.label}>
                    <td className="py-2.5 pr-3 font-medium">{bucket.label}</td>
                    <td className="py-2.5 pr-3">{bucket.count}</td>
                    <td className="py-2.5">{formatFcfaAbsolute(bucket.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
    </div>
  );
}
