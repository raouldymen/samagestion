import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFcfaAbsolute, formatPercent } from "@/lib/utils/format";
import type { ReportPaymentRow } from "@/types/reports";

const DISPLAY_ORDER = ["cash", "wave", "orange_money", "card", "bank", "other"] as const;

export function PaymentMethodsChart({ payments }: { payments: ReportPaymentRow[] }) {
  const ordered = DISPLAY_ORDER.map((method) => payments.find((item) => item.method === method)).filter(
    (item): item is ReportPaymentRow => Boolean(item),
  );
  const max = Math.max(0, ...ordered.map((item) => item.amount));

  return (
    <section aria-labelledby="payment-methods-title">
      <Card>
        <CardHeader>
          <CardTitle id="payment-methods-title">Modes de paiement</CardTitle>
        </CardHeader>
        {max === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune vente encaissée sur cette période.</p>
        ) : (
          <ul className="space-y-3">
            {ordered.map((item) => {
              const width = item.amount === 0 ? 0 : Math.max(4, Math.round((item.amount / max) * 100));

              return (
                <li key={item.method}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-muted-foreground">
                      {item.salesCount} vente{item.salesCount > 1 ? "s" : ""} · {formatFcfaAbsolute(item.amount)} ·{" "}
                      {formatPercent(item.percent)}
                    </p>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${width}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </section>
  );
}
