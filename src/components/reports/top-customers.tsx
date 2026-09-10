import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { ReportCustomerRow } from "@/types/reports";

export function TopCustomers({
  customers,
}: {
  customers: ReportCustomerRow[];
}) {
  return (
    <section aria-labelledby="top-customers-title">
      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle id="top-customers-title">Meilleurs clients</CardTitle>
        </CardHeader>
        {customers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun client n&apos;a acheté sur cette période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Client</th>
                  <th className="pb-2 pr-3 font-medium">Nombre de ventes</th>
                  <th className="pb-2 pr-3 font-medium">Montant dépensé</th>
                  <th className="pb-2 font-medium">Dette</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((item) => (
                  <tr key={item.name}>
                    <td className="py-2.5 pr-3 font-medium">{item.name}</td>
                    <td className="py-2.5 pr-3">{item.salesCount}</td>
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
  );
}
