"use client";

import { Download, Printer, ReceiptText, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { SaleStatusBadge } from "@/components/sales/sale-status-badge";
import { paymentMethodLabel } from "@/lib/sales/constants";
import { shareReceiptPdf } from "@/lib/receipts/browser";
import { formatDateTime, formatFcfaAbsolute } from "@/lib/utils/format";
import type { Sale } from "@/types/sales";

export function SaleDetails({ sale }: { sale: Sale }) {
  const receiptHref = `/sales/${sale.id}/receipt`;
  const pdfHref = `/sales/${sale.id}/receipt/pdf`;
  const receiptText = [
    `Vente ${sale.saleNumber}`,
    formatDateTime(sale.createdAt),
    `Client : ${sale.customerName ?? "Client comptoir"}`,
    `Vendeur : ${sale.sellerName}`,
    ...sale.items.map(
      (item) => `${item.productName}  ${item.quantity} × ${formatFcfaAbsolute(item.unitPrice)}`,
    ),
    `Sous-total ${formatFcfaAbsolute(sale.subtotal)}`,
    `Remise ${formatFcfaAbsolute(sale.discount)}`,
    `TOTAL ${formatFcfaAbsolute(sale.total)}`,
    `Payé ${formatFcfaAbsolute(sale.amountPaid)}`,
    `Reste ${formatFcfaAbsolute(sale.amountDue)}`,
    `Paiement : ${paymentMethodLabel(sale.paymentMethod)}`,
  ].join("\n");

  async function shareReceipt() {
    await shareReceiptPdf({
      pdfHref,
      filename: `recu-${sale.saleNumber.replaceAll("/", "-")}.pdf`,
      title: `Reçu ${sale.saleNumber}`,
      text: receiptText,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button href={receiptHref}>
          <Printer className="size-4" aria-hidden="true" />
          Imprimer le reçu
        </Button>
        <Button href={receiptHref} variant="outline">
          <ReceiptText className="size-4" aria-hidden="true" />
          Réimprimer
        </Button>
        <Button href={pdfHref} variant="outline">
          <Download className="size-4" aria-hidden="true" />
          Télécharger PDF
        </Button>
        <Button type="button" variant="outline" onClick={() => void shareReceipt()}>
          <Share2 className="size-4" aria-hidden="true" />
          Partager
        </Button>
      </div>
      <Card className="receipt">
        <CardHeader>
          <CardTitle>Vente {sale.saleNumber}</CardTitle>
          <SaleStatusBadge paymentStatus={sale.paymentStatus} status={sale.status} />
        </CardHeader>
        <p className="text-sm text-muted-foreground">{formatDateTime(sale.createdAt)}</p>
        <dl className="mt-4 grid gap-2 text-sm">
          <div>
            <dt className="text-muted-foreground">Client</dt>
            <dd className="font-medium">{sale.customerName ?? "Client comptoir"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Vendeur</dt>
            <dd className="font-medium">{sale.sellerName}</dd>
          </div>
        </dl>
        <h3 className="mt-5 text-sm font-semibold">Produits</h3>
        <ul className="mt-2 divide-y divide-border">
          {sale.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                {item.productName}{" "}
                <span className="text-muted-foreground">
                  {item.quantity} × {formatFcfaAbsolute(item.unitPrice)}
                </span>
              </span>
              <span className="font-medium">{formatFcfaAbsolute(item.total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>Sous-total</dt>
            <dd>{formatFcfaAbsolute(sale.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Remise</dt>
            <dd>{formatFcfaAbsolute(sale.discount)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>TOTAL</dt>
            <dd>{formatFcfaAbsolute(sale.total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Payé</dt>
            <dd>{formatFcfaAbsolute(sale.amountPaid)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Reste</dt>
            <dd>{formatFcfaAbsolute(sale.amountDue)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Paiement</dt>
            <dd>{paymentMethodLabel(sale.paymentMethod)}</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
