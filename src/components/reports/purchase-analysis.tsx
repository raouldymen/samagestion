import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { ReportsBundle } from "@/types/reports";

export function PurchaseAnalysis({ bundle }: { bundle: ReportsBundle }) {
  const stats = [
    { label: "Montant des achats", value: formatFcfaAbsolute(bundle.purchases.total) },
    { label: "Nombre d'achats", value: String(bundle.purchases.count) },
    { label: "Fournisseurs", value: String(bundle.purchases.suppliersCount) },
    { label: "Dettes fournisseurs", value: formatFcfaAbsolute(bundle.purchases.payablesOpen) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="purchase-analysis-title">
        <Card>
          <CardHeader>
            <CardTitle id="purchase-analysis-title">Analyse des achats</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((item) => (
              <div key={item.label}>
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="mt-1 text-lg font-semibold">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section aria-labelledby="top-suppliers-title">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle id="top-suppliers-title">Fournisseurs les plus importants</CardTitle>
          </CardHeader>
          {bundle.suppliers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun achat sur cette période.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Fournisseur</th>
                    <th className="pb-2 pr-3 font-medium">Nombre d&apos;achats</th>
                    <th className="pb-2 pr-3 font-medium">Montant acheté</th>
                    <th className="pb-2 font-medium">Dette</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bundle.suppliers.map((item) => (
                    <tr key={item.name}>
                      <td className="py-2.5 pr-3 font-medium">{item.name}</td>
                      <td className="py-2.5 pr-3">{item.purchasesCount}</td>
                      <td className="py-2.5 pr-3">{formatFcfaAbsolute(item.spent)}</td>
                      <td className="py-2.5">{formatFcfaAbsolute(item.due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
