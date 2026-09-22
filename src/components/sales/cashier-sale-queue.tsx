"use client";

import { useActionState, useState, useTransition } from "react";
import { cancelCashierSaleAction, completeCashierSaleAction, markOwnerSaleCollectionAction } from "@/lib/sales/actions";
import { draftFromQueuedSale, savePendingSaleDraft } from "@/lib/sales/pending-draft";
import { PAYMENT_METHODS } from "@/lib/sales/constants";
import { formatDateTime, formatFcfaAbsolute } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CashierClosureCard } from "@/components/sales/cashier-closure-card";
import { CashierCompletedReceipt } from "@/components/sales/cashier-completed-receipt";
import { useCashierCheckoutLiveData } from "@/components/sales/cashier-collections-live-refresh";
import { useRouter } from "next/navigation";
import type { CashierCheckoutSummary, CashierClosureSummary, CashierQueuedSale, CashierTodaySale, OwnerSaleCollection } from "@/lib/sales/queries";

export function CashierSaleQueue({
  businessId,
  sales,
  summary,
  ownerCollections,
  todaySales,
  closure,
}: {
  businessId: string;
  sales: CashierQueuedSale[];
  summary: CashierCheckoutSummary;
  ownerCollections: OwnerSaleCollection[];
  todaySales: CashierTodaySale[];
  closure: CashierClosureSummary | null;
}) {
  const live = useCashierCheckoutLiveData(businessId, { sales, summary, ownerCollections, todaySales });
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.sessionStorage.getItem("cashier-open-receipt");
  });

  function openReceipt(saleId: string) {
    window.sessionStorage.setItem("cashier-open-receipt", saleId);
    setReceiptSaleId(saleId);
  }

  function closeReceipt() {
    window.sessionStorage.removeItem("cashier-open-receipt");
    setReceiptSaleId(null);
  }
  const methodTotals = Object.entries(live.summary.byMethod).filter(([, total]) => total > 0);

  const recap = (
    <Card className="border-primary/20 bg-primary-soft p-4">
      <p className="text-sm font-medium text-primary">Encaissements du jour</p>
      <p className="mt-1 text-2xl font-semibold text-primary">{formatFcfaAbsolute(live.summary.total)}</p>
      <p className="text-sm text-primary/80">{live.summary.count} vente{live.summary.count > 1 ? "s" : ""} encaissée{live.summary.count > 1 ? "s" : ""}</p>
      {methodTotals.length ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-primary">
          {methodTotals.map(([method, total]) => <span key={method}>{PAYMENT_METHODS.find((item) => item.value === method)?.label ?? "Autre"} : {formatFcfaAbsolute(total)}</span>)}
        </div>
      ) : null}
      {live.summary.sales.length ? (
        <div className="mt-4 border-t border-primary/15 pt-3 text-sm text-primary">
          <p className="mb-1 font-medium">Derniers encaissements</p>
          {live.summary.sales.slice(0, 5).map((sale) => (
            <div key={sale.id} className="flex justify-between gap-3 py-1">
              <span>{sale.saleNumber} · {PAYMENT_METHODS.find((item) => item.value === sale.paymentMethod)?.label ?? "Autre"}</span>
              <span className="font-medium">{formatFcfaAbsolute(sale.amountPaid)}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );

  const ownerCollectionsPanel = live.ownerCollections.length ? (
    <Card className="border-amber-200 bg-amber-50/60 p-3">
      <p className="text-sm font-semibold text-amber-900">À encaisser pour le propriétaire</p>
      <div className="mt-2 divide-y divide-amber-200">
        {live.ownerCollections.map((collection) => <OwnerSaleCollectionRow key={collection.id} collection={collection} />)}
      </div>
    </Card>
  ) : null;

  const queuedSalesPanel = (
    <div className="grid gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold">Ventes envoyées à la caisse</p>
        {live.sales.length ? (
          <p className="text-xs text-muted-foreground">{live.sales.length} en attente</p>
        ) : null}
      </div>
      {live.sales.length === 0 ? (
        <Card className="py-10 text-center">
          <p className="font-medium">Aucune vente à encaisser.</p>
          <p className="mt-1 text-sm text-muted-foreground">Les ventes envoyées par les vendeurs apparaîtront ici tout de suite.</p>
        </Card>
      ) : (
        live.sales.map((sale) => <CashierSaleCard key={sale.id} sale={sale} onCompleted={openReceipt} />)
      )}
    </div>
  );

  const todaySalesPanel = live.todaySales.length ? (
    <Card className="p-3">
      <p className="text-sm font-semibold">Ventes du jour</p>
      <div className="mt-2 divide-y divide-border">
        {live.todaySales.slice(0, 10).map((sale) => (
          <button
            key={sale.id}
            type="button"
            onClick={() => openReceipt(sale.id)}
            className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm hover:bg-muted/60"
          >
            <div className="min-w-0">
              <p className="font-medium">{sale.saleNumber} · Vendeur : {sale.sellerName}</p>
              <p className="text-xs text-muted-foreground">{sale.paymentStatus === "paid" ? "Payée" : sale.paymentStatus === "partial" ? "Partiellement payée" : "Impayée"}</p>
            </div>
            <span className="shrink-0 font-semibold">{formatFcfaAbsolute(sale.amountPaid)}</span>
          </button>
        ))}
      </div>
      {live.todaySales.length > 10 ? <p className="mt-2 text-xs text-muted-foreground">Les 10 dernières ventes sont affichées.</p> : null}
    </Card>
  ) : null;

  return (
    <div className="grid gap-4">
      {recap}
      {closure ? <CashierClosureCard summary={closure} /> : null}
      {ownerCollectionsPanel}
      {queuedSalesPanel}
      {todaySalesPanel}
      <CashierCompletedReceipt saleId={receiptSaleId} onClose={closeReceipt} />
    </div>
  );
}

function OwnerSaleCollectionRow({ collection }: { collection: OwnerSaleCollection }) {
  const router = useRouter();
  const [collecting, startCollect] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
      <div>
        <p className="font-medium text-amber-950">{collection.saleNumber} · {formatFcfaAbsolute(collection.amount)}</p>
        <p className="text-xs text-amber-800">Validée par {collection.ownerName} · {PAYMENT_METHODS.find((item) => item.value === collection.paymentMethod)?.label ?? "Paiement"}</p>
      </div>
      <Button
        type="button"
        size="sm"
        loading={collecting}
        onClick={() => startCollect(async () => {
          const result = await markOwnerSaleCollectionAction(collection.id);
          if (result.error) setError(result.error);
          else router.refresh();
        })}
      >
        Encaisser
      </Button>
      {error ? <p className="basis-full text-xs text-danger" role="alert">{error}</p> : null}
    </div>
  );
}

function CashierSaleCard({ sale, onCompleted }: { sale: CashierQueuedSale; onCompleted: (saleId: string) => void }) {
  const [amountPaid, setAmountPaid] = useState(sale.subtotal - sale.discount);
  const [state, action, pending] = useActionState(async (previous: { error: string | null; saleId?: string }, formData: FormData) => {
    const result = await completeCashierSaleAction(previous, formData);
    if (result.saleId) {
      onCompleted(result.saleId);
    }
    return result;
  }, { error: null });
  const total = sale.subtotal - sale.discount;
  const router = useRouter();
  const [busy, startBusy] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{sale.customerName ?? "Client comptoir"} · Vendeur : {sale.sellerName}</p>
          <p className="text-sm text-muted-foreground">{formatDateTime(sale.createdAt)}{sale.customerPhone ? ` · ${sale.customerPhone}` : ""}</p>
        </div>
        <p className="text-lg font-semibold">{formatFcfaAbsolute(total)}</p>
      </div>
      <ul className="mt-4 divide-y divide-border border-y border-border text-sm">
        {sale.items.map((item) => (
          <li key={item.productId} className="flex justify-between gap-3 py-2">
            <span>{item.name} <span className="text-muted-foreground">× {item.quantity}</span></span>
            <span className="font-medium">{formatFcfaAbsolute(item.total)}</span>
          </li>
        ))}
      </ul>
      {sale.discount > 0 ? <p className="mt-2 text-sm text-muted-foreground">Remise : {formatFcfaAbsolute(sale.discount)}</p> : null}
      {sale.notes ? <p className="mt-2 text-sm text-muted-foreground">Note : {sale.notes}</p> : null}
      <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="queueId" value={sale.id} />
        <Select id={`payment-${sale.id}`} name="paymentMethod" label="Mode de paiement" defaultValue="cash">
          {PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
        </Select>
        <Input
          id={`amount-${sale.id}`}
          name="amountPaid"
          label="Montant encaissé"
          type="number"
          inputMode="decimal"
          min={0}
          max={total}
          step="0.01"
          value={amountPaid}
          onChange={(event) => setAmountPaid(Number(event.target.value) || 0)}
        />
        {state.error ? <p className="text-sm text-danger sm:col-span-2" role="alert">{state.error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
          <Button
            type="button"
            variant="outline"
            loading={busy}
            onClick={() => startBusy(async () => {
              savePendingSaleDraft(draftFromQueuedSale({
                items: sale.items,
                discount: sale.discount,
                customerId: sale.customerId,
                notes: sale.notes,
                sellerId: sale.sellerId,
              }));
              const result = await cancelCashierSaleAction(sale.id);
              if (result.error) {
                setActionError(result.error);
                return;
              }
              router.push("/sales/new?edit=1");
            })}
          >
            Modifier
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={busy}
            onClick={() => startBusy(async () => {
              const result = await cancelCashierSaleAction(sale.id);
              if (result.error) setActionError(result.error);
              else router.refresh();
            })}
          >
            Annuler
          </Button>
          <Button type="submit" loading={pending}>Valider</Button>
        </div>
      </form>
      {actionError ? <p className="mt-2 text-sm text-danger" role="alert">{actionError}</p> : null}
    </Card>
  );
}
