import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PurchaseStatusBadge } from "@/components/purchases/purchase-status-badge";
import { paymentMethodLabel } from "@/lib/sales/constants";
import { formatCalendarDate, formatFcfaAbsolute } from "@/lib/utils/format";
import type { Purchase } from "@/types/purchases";

export function PurchaseDetails({ purchase }: { purchase: Purchase }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Achat {purchase.purchaseNumber}</CardTitle>
          <PurchaseStatusBadge paymentStatus={purchase.paymentStatus} status={purchase.status} />
        </CardHeader>
        <p className="text-sm text-muted-foreground">{formatCalendarDate(purchase.purchaseDate)}</p>
        <dl className="mt-4 grid gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Fournisseur</dt>
            <dd className="font-medium">{purchase.supplierName ?? "Aucun fournisseur"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Saisi par</dt>
            <dd className="font-medium">{purchase.creatorName}</dd>
          </div>
        </dl>
        <h3 className="mt-5 text-sm font-semibold">Produits</h3>
        <ul className="mt-2 divide-y divide-border">
          {purchase.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                {item.productName}{" "}
                <span className="text-muted-foreground">
                  {item.quantity} × {formatFcfaAbsolute(item.unitCost)}
                </span>
              </span>
              <span className="font-medium">{formatFcfaAbsolute(item.total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>Sous-total</dt>
            <dd>{formatFcfaAbsolute(purchase.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Remise</dt>
            <dd>{formatFcfaAbsolute(purchase.discount)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>TOTAL</dt>
            <dd>{formatFcfaAbsolute(purchase.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Payé</dt>
            <dd>{formatFcfaAbsolute(purchase.amountPaid)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Reste</dt>
            <dd>{formatFcfaAbsolute(purchase.amountDue)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Paiement</dt>
            <dd>{paymentMethodLabel(purchase.paymentMethod)}</dd>
          </div>
        </dl>
        {purchase.status === "completed" && purchase.amountDue > 0 ? (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
            Dette fournisseur : {formatFcfaAbsolute(purchase.amountDue)}
          </p>
        ) : null}
        {purchase.notes ? (
          <p className="mt-4 text-sm text-muted-foreground">{purchase.notes}</p>
        ) : null}
      </Card>
    </div>
  );
}
