import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFcfaAbsolute, formatPercent } from "@/lib/utils/format";
import type { ReportsBundle } from "@/types/reports";

export function TopProducts({ bundle }: { bundle: ReportsBundle }) {
  return (
    <div className="flex flex-col gap-4">
      <ProductTable
        title="Produits les plus vendus"
        id="top-sold-title"
        empty="Aucune vente sur cette période."
        headers={["Produit", "Quantité vendue", "CA généré", "Marge générée"]}
        rows={bundle.topSold.map((item) => [
          item.name,
          `${item.quantity} unité${item.quantity > 1 ? "s" : ""}`,
          formatFcfaAbsolute(item.revenue),
          formatFcfaAbsolute(item.margin),
        ])}
      />
      <ProductTable
        title="Produits les plus rentables"
        id="top-margin-title"
        empty="Aucune marge calculable sur cette période."
        headers={["Produit", "CA", "Coût", "Marge", "Taux de marge"]}
        rows={bundle.topMargin.map((item) => [
          item.name,
          formatFcfaAbsolute(item.revenue),
          formatFcfaAbsolute(item.cogs),
          formatFcfaAbsolute(item.margin),
          formatPercent(item.marginRate),
        ])}
      />
      <LowPerformance bundle={bundle} />
    </div>
  );
}

function ProductTable({
  title,
  id,
  empty,
  headers,
  rows,
}: {
  title: string;
  id: string;
  empty: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <section aria-labelledby={id}>
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle id={id}>{title}</CardTitle>
        </CardHeader>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  {headers.map((header) => (
                    <th key={header} className="pb-2 pr-3 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.join("-")}>
                    {row.map((cell, index) => (
                      <td key={`${cell}-${index}`} className={`py-2.5 pr-3 ${index === 0 ? "font-medium" : ""}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}

function LowPerformance({ bundle }: { bundle: ReportsBundle }) {
  const hasUnsold = bundle.unsold.length > 0;
  const hasLowSold = bundle.lowSold.length > 0;

  return (
    <section aria-labelledby="low-products-title">
      <Card>
        <CardHeader>
          <CardTitle id="low-products-title">Produits peu vendus</CardTitle>
        </CardHeader>
        {!hasUnsold && !hasLowSold ? (
          <p className="text-sm text-muted-foreground">Tous les produits actifs ont été vendus sur la période.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {hasUnsold ? (
              <div>
                <p className="text-sm font-medium">
                  {bundle.shortPeriod ? "Aucune vente sur la période" : "Sans vente"}
                </p>
                {bundle.shortPeriod ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    La période est courte : l&apos;absence de vente n&apos;indique pas un mauvais produit.
                  </p>
                ) : null}
                <ul className="mt-2 space-y-1 text-sm">
                  {bundle.unsold.map((item) => (
                    <li key={item.name}>{item.name}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {hasLowSold ? (
              <div>
                <p className="text-sm font-medium">Très peu de ventes</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {bundle.lowSold.map((item) => (
                    <li key={item.name}>
                      {item.name}{" "}
                      <span className="text-muted-foreground">
                        · {item.quantity} unité{item.quantity > 1 ? "s" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </Card>
    </section>
  );
}
