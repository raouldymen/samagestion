"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { CustomerPicker } from "@/components/sales/customer-picker";
import { Dialog } from "@/components/ui/dialog";
import { cancelCashierSaleAction, completeCashierSaleAction, markOwnerSaleCollectionAction, updateCashierSaleAction } from "@/lib/sales/actions";
import { PAYMENT_METHODS } from "@/lib/sales/constants";
import { formatDateTime, formatFcfaAbsolute } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CashierClosureCard } from "@/components/sales/cashier-closure-card";
import { useCashierCheckoutLiveData } from "@/components/sales/cashier-collections-live-refresh";
import { useRouter } from "next/navigation";
import type { CashierCheckoutSummary, CashierClosureSummary, CashierQueuedSale, CashierTodaySale, OwnerSaleCollection } from "@/lib/sales/queries";
import type { Customer } from "@/types/sales";

export function CashierSaleQueue({
  businessId,
  sales,
  summary,
  customers,
  ownerCollections,
  todaySales,
  closure,
}: {
  businessId: string;
  sales: CashierQueuedSale[];
  summary: CashierCheckoutSummary;
  customers: Customer[];
  ownerCollections: OwnerSaleCollection[];
  todaySales: CashierTodaySale[];
  closure: CashierClosureSummary | null;
}) {
  const live = useCashierCheckoutLiveData(businessId, { sales, summary, ownerCollections, todaySales });
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
        live.sales.map((sale) => <CashierSaleCard key={sale.id} sale={sale} customers={customers} />)
      )}
    </div>
  );

  const todaySalesPanel = live.todaySales.length ? (
    <Card className="p-3">
      <p className="text-sm font-semibold">Ventes du jour</p>
      <div className="mt-2 divide-y divide-border">
        {live.todaySales.slice(0, 10).map((sale) => (
          <div key={sale.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <div className="min-w-0">
              <p className="font-medium">{sale.saleNumber} · {sale.sellerName}</p>
              <p className="text-xs text-muted-foreground">{sale.paymentStatus === "paid" ? "Payée" : sale.paymentStatus === "partial" ? "Partiellement payée" : "Impayée"}</p>
            </div>
            <span className="shrink-0 font-semibold">{formatFcfaAbsolute(sale.amountPaid)}</span>
          </div>
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

function CashierSaleCard({ sale, customers }: { sale: CashierQueuedSale; customers: Customer[] }) {
  const [amountPaid, setAmountPaid] = useState(sale.subtotal - sale.discount);
  const [state, action, pending] = useActionState(completeCashierSaleAction, { error: null });
  const total = sale.subtotal - sale.discount;
  const router = useRouter();
  const [cancelling, startCancel] = useTransition();
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItems, setEditItems] = useState(sale.items);
  const [customerId, setCustomerId] = useState(sale.customerId ?? "");
  const [editing, startEdit] = useTransition();
  const [editError, setEditError] = useState<string | null>(null);
  const editedTotal = useMemo(
    () => Math.max(0, editItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) - sale.discount),
    [editItems, sale.discount],
  );

  function updateItem(productId: string, field: "quantity" | "unitPrice", value: number) {
    setEditItems((items) => items.map((item) => item.productId === productId ? { ...item, [field]: value } : item));
  }

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Vente de {sale.sellerName}</p>
          <p className="text-sm text-muted-foreground">{formatDateTime(sale.createdAt)} · {sale.customerName ?? "Client comptoir"}{sale.customerPhone ? ` · ${sale.customerPhone}` : ""}</p>
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
          <Button type="button" variant="outline" onClick={() => setEditOpen(true)}>Modifier</Button>
          <Button
            type="button"
            variant="danger"
            loading={cancelling}
            onClick={() => startCancel(async () => {
              const result = await cancelCashierSaleAction(sale.id);
              if (result.error) setCancelError(result.error);
              else router.refresh();
            })}
          >
            Annuler
          </Button>
          <Button type="submit" loading={pending}>Valider</Button>
        </div>
      </form>
      {cancelError ? <p className="mt-2 text-sm text-danger" role="alert">{cancelError}</p> : null}
      <Dialog open={editOpen} title="Modifier la vente" onClose={() => setEditOpen(false)}>
        <form
          className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto pr-1"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startEdit(async () => {
              const result = await updateCashierSaleAction({ error: null }, formData);
              if (result.error) {
                setEditError(result.error);
                return;
              }
              setEditError(null);
              setEditOpen(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="queueId" value={sale.id} />
          <input type="hidden" name="discount" value={sale.discount} />
          <input type="hidden" name="notes" value={sale.notes ?? ""} />
          <input type="hidden" name="items" value={JSON.stringify(editItems)} />
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Produits</p>
            {editItems.map((item) => (
              <div key={item.productId} className="rounded-lg border border-border p-3">
                <p className="mb-3 text-sm font-medium">{item.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    id={`quantity-${sale.id}-${item.productId}`}
                    label="Quantité"
                    type="number"
                    inputMode="decimal"
                    min={1}
                    max={item.stockQuantity}
                    step="1"
                    value={item.quantity}
                    onChange={(event) => updateItem(item.productId, "quantity", Number(event.target.value) || 0)}
                  />
                  <Input
                    id={`price-${sale.id}-${item.productId}`}
                    label="Prix unitaire"
                    type="number"
                    inputMode="decimal"
                    min={0.01}
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(event) => updateItem(item.productId, "unitPrice", Number(event.target.value) || 0)}
                  />
                </div>
                <p className="mt-2 text-right text-sm font-medium">{formatFcfaAbsolute(item.quantity * item.unitPrice)}</p>
              </div>
            ))}
          </div>
          <CustomerPicker customers={customers} value={customerId} onChange={setCustomerId} />
          <p className="text-right text-sm font-semibold">Nouveau total : {formatFcfaAbsolute(editedTotal)}</p>
          {editError ? <p className="text-sm text-danger" role="alert">{editError}</p> : null}
          <Button type="submit" loading={editing}>Enregistrer les modifications</Button>
        </form>
      </Dialog>
    </Card>
  );
}
