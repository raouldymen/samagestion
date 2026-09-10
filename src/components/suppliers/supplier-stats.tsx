import { Card } from "@/components/ui/card";
import { formatCalendarDate, formatFcfaAbsolute } from "@/lib/utils/format";
import type { SupplierDetail } from "@/types/purchases";

export function SupplierStats({ supplier }: { supplier: SupplierDetail }) {
  const items = [
    { label: "Total achats", value: String(supplier.purchasesCount) },
    { label: "Montant total", value: formatFcfaAbsolute(supplier.purchasesTotal) },
    { label: "Montant payé", value: formatFcfaAbsolute(supplier.amountPaid) },
    { label: "Dette", value: formatFcfaAbsolute(supplier.amountDue) },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <p className="text-sm text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-lg font-semibold">{item.value}</p>
        </Card>
      ))}
      <Card className="col-span-2 lg:col-span-4">
        <p className="text-sm text-muted-foreground">Dernier achat</p>
        <p className="mt-1 font-medium">
          {supplier.lastPurchaseAt ? formatCalendarDate(supplier.lastPurchaseAt) : "Aucun achat"}
        </p>
      </Card>
    </section>
  );
}
