import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatFcfaAbsolute } from "@/lib/utils/format";
import type { ReportsBundle } from "@/types/reports";

export function StockAnalysis({ bundle }: { bundle: ReportsBundle }) {
  const { stock } = bundle;
  const stats = [
    { label: "Nombre de produits", value: String(stock.productsCount) },
    { label: "Valeur du stock", value: formatFcfaAbsolute(stock.stockValue) },
    { label: "Produits en stock faible", value: String(stock.lowStock) },
    { label: "Produits en rupture", value: String(stock.outOfStock) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="stock-analysis-title">
        <Card>
          <CardHeader>
            <CardTitle id="stock-analysis-title">Analyse du stock</CardTitle>
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

      <section aria-labelledby="low-stock-title">
        <Card className="overflow-hidden">
          <CardHeader className="items-center">
            <CardTitle id="low-stock-title">Stock faible</CardTitle>
            <Badge variant="warning">Stock faible</Badge>
          </CardHeader>
          {bundle.lowStockItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun produit en stock faible.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[24rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Produit</th>
                    <th className="pb-2 pr-3 font-medium">Stock actuel</th>
                    <th className="pb-2 font-medium">Stock minimum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bundle.lowStockItems.map((item) => (
                    <tr key={item.name}>
                      <td className="py-2.5 pr-3 font-medium">{item.name}</td>
                      <td className="py-2.5 pr-3">{item.stockQuantity}</td>
                      <td className="py-2.5">{item.minimumStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>

      <section aria-labelledby="out-stock-title">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle id="out-stock-title">Produits en rupture</CardTitle>
          </CardHeader>
          {bundle.outOfStockItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun produit en rupture.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2 pr-3 font-medium">Produit</th>
                    <th className="pb-2 pr-3 font-medium">Dernière vente</th>
                    <th className="pb-2 font-medium">Catégorie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bundle.outOfStockItems.map((item) => (
                    <tr key={item.name}>
                      <td className="py-2.5 pr-3 font-medium">{item.name}</td>
                      <td className="py-2.5 pr-3">
                        {item.lastSaleAt ? formatDateTime(item.lastSaleAt) : "Jamais"}
                      </td>
                      <td className="py-2.5">{item.category ?? "Sans catégorie"}</td>
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
