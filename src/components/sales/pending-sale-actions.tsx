"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CustomerPicker } from "@/components/sales/customer-picker";
import { ProductSearch } from "@/components/sales/product-search";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cancelCashierSaleAction, updateCashierSaleAction } from "@/lib/sales/actions";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { Customer, PendingSaleItem, SaleListItem, SaleProductOption } from "@/types/sales";

export function PendingSaleActions({
  sale,
  customers,
}: {
  sale: SaleListItem;
  customers: Customer[];
}) {
  const router = useRouter();
  const [cancelling, startCancel] = useTransition();
  const [editing, startEdit] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [editItems, setEditItems] = useState<PendingSaleItem[]>(sale.pendingItems ?? []);
  const [customerId, setCustomerId] = useState(sale.customerId ?? "");
  const [error, setError] = useState<string | null>(null);
  const editedSubtotal = useMemo(
    () => editItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [editItems],
  );
  const editedTotal = Math.max(0, editedSubtotal - Math.min(sale.discount, editedSubtotal));

  function openEdit() {
    setEditItems(sale.pendingItems ?? []);
    setCustomerId(sale.customerId ?? "");
    setError(null);
    setEditOpen(true);
  }

  function updateQuantity(productId: string, quantity: number) {
    setEditItems((items) => items.map((item) => (
      item.productId === productId ? { ...item, quantity } : item
    )));
  }

  function removeItem(productId: string) {
    setEditItems((items) => items.filter((item) => item.productId !== productId));
  }

  function addProduct(product: SaleProductOption) {
    setEditItems((items) => [
      ...items,
      {
        productId: product.id,
        name: product.name,
        quantity: 1,
        unitPrice: product.sellingPrice,
        stockQuantity: product.stockQuantity,
        total: product.sellingPrice,
      },
    ]);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" variant="outline" onClick={openEdit}>
        Modifier
      </Button>
      <Button
        type="button"
        size="sm"
        variant="danger"
        loading={cancelling}
        onClick={() => {
          if (!window.confirm("Annuler cette vente en attente ? Elle disparaîtra de la file de caisse.")) {
            return;
          }
          startCancel(async () => {
            const result = await cancelCashierSaleAction(sale.id);
            if (result.error) {
              setError(result.error);
              return;
            }
            setError(null);
            router.refresh();
          });
        }}
      >
        Annuler
      </Button>
      {error && !editOpen ? <p className="basis-full text-sm text-danger" role="alert">{error}</p> : null}
      <Dialog open={editOpen} title="Modifier la vente en attente" onClose={() => setEditOpen(false)}>
        <form
          className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto pr-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (editItems.length === 0) {
              setError("Ajoutez au moins un produit.");
              return;
            }
            const formData = new FormData(event.currentTarget);
            startEdit(async () => {
              const result = await updateCashierSaleAction({ error: null }, formData);
              if (result.error) {
                setError(result.error);
                return;
              }
              setError(null);
              setEditOpen(false);
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="queueId" value={sale.id} />
          <input type="hidden" name="discount" value={Math.min(sale.discount, editedSubtotal)} />
          <input type="hidden" name="notes" value={sale.notes ?? ""} />
          <input type="hidden" name="items" value={JSON.stringify(editItems)} />
          <ProductSearch
            onAdd={addProduct}
            cart={editItems.map((item) => ({
              productId: item.productId,
              name: item.name,
              unitPrice: item.unitPrice,
              stockQuantity: item.stockQuantity,
              quantity: item.quantity,
            }))}
            products={[]}
          />
          <div className="flex flex-col gap-3">
            {editItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ajoutez au moins un produit.</p>
            ) : null}
            {editItems.map((item) => (
              <div key={item.productId} className="rounded-lg border border-border p-3">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <p className="text-sm font-medium">{item.name}</p>
                  {editItems.length > 1 ? (
                    <button
                      type="button"
                      className="text-sm text-danger hover:underline"
                      onClick={() => removeItem(item.productId)}
                    >
                      Retirer
                    </button>
                  ) : null}
                </div>
                <Input
                  id={`pending-qty-${sale.id}-${item.productId}`}
                  label="Quantité"
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={item.stockQuantity}
                  step="1"
                  value={item.quantity}
                  onChange={(event) => updateQuantity(item.productId, Number(event.target.value) || 0)}
                />
                <p className="mt-2 text-right text-sm font-medium">
                  {formatFcfaAbsolute(item.quantity * item.unitPrice)}
                </p>
              </div>
            ))}
          </div>
          <CustomerPicker customers={customers} value={customerId} onChange={setCustomerId} />
          {sale.discount > 0 ? (
            <p className="text-sm text-muted-foreground">
              Remise : {formatFcfaAbsolute(Math.min(sale.discount, editedSubtotal))}
            </p>
          ) : null}
          <p className="text-right text-sm font-semibold">Nouveau total : {formatFcfaAbsolute(editedTotal)}</p>
          {error ? <p className="text-sm text-danger" role="alert">{error}</p> : null}
          <Button type="submit" loading={editing}>Enregistrer les modifications</Button>
        </form>
      </Dialog>
    </div>
  );
}
