"use client";

import { useActionState, useState, type FormEvent } from "react";
import { useBusinessSession } from "@/components/providers/business-provider";
import { CustomerPicker } from "@/components/sales/customer-picker";
import { PaymentSection } from "@/components/sales/payment-section";
import { ProductSearch } from "@/components/sales/product-search";
import { SaleCart } from "@/components/sales/sale-cart";
import { SaleSummary } from "@/components/sales/sale-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createSaleAction } from "@/lib/sales/actions";
import { enqueueOfflineSale } from "@/lib/offline/sales-queue";
import { cartSubtotal, saleTotals } from "@/lib/sales/constants";
import type { CartLine, Customer, PaymentMethod, SaleProductOption } from "@/types/sales";

export function SaleForm({
  customers,
  products,
  requiresCashierCheckout = false,
  ownerCanChooseCheckout = false,
}: {
  customers: Customer[];
  products: SaleProductOption[];
  requiresCashierCheckout?: boolean;
  ownerCanChooseCheckout?: boolean;
}) {
  const session = useBusinessSession();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountPaid, setAmountPaid] = useState(0);
  const [paidTouched, setPaidTouched] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [offlineMessage, setOfflineMessage] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(createSaleAction, { error: null });

  const subtotal = cartSubtotal(cart);
  const baseTotal = saleTotals(subtotal, discount, 0).total;
  const paid = paidTouched ? amountPaid : baseTotal;
  const displayTotals = saleTotals(subtotal, discount, paid);

  function addProduct(product: SaleProductOption) {
    const existing = cart.find((item) => item.productId === product.id);
    const nextQuantity = (existing?.quantity ?? 0) + 1;

    if (nextQuantity > product.stockQuantity) {
      setStockError(`Stock insuffisant. Stock disponible : ${product.stockQuantity}`);
      return;
    }

    setStockError(null);

    if (existing) {
      setCart(
        cart.map((item) =>
          item.productId === product.id ? { ...item, quantity: nextQuantity, stockQuantity: product.stockQuantity } : item,
        ),
      );
      return;
    }

    setCart([
      ...cart,
      {
        productId: product.id,
        name: product.name,
        unitPrice: product.sellingPrice,
        stockQuantity: product.stockQuantity,
        quantity: 1,
      },
    ]);
  }

  function updateQuantity(productId: string, quantity: number) {
    const item = cart.find((line) => line.productId === productId);

    if (!item) {
      return;
    }

    if (quantity <= 0) {
      setCart(cart.filter((line) => line.productId !== productId));
      setStockError(null);
      return;
    }

    if (quantity > item.stockQuantity) {
      setStockError(`Stock insuffisant. Stock disponible : ${item.stockQuantity}`);
      return;
    }

    setStockError(null);
    setCart(cart.map((line) => (line.productId === productId ? { ...line, quantity } : line)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (navigator.onLine) return;
    event.preventDefault();
    if (cart.length === 0) return;

    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const checkoutMode = submitter?.name === "checkoutMode" ? submitter.value : "";
    try {
      await enqueueOfflineSale({
        businessId: session.businessId,
        userId: session.user.id,
        items: cart,
        discount,
        customerId,
        paymentMethod: requiresCashierCheckout ? "cash" : paymentMethod,
        amountPaid: requiresCashierCheckout ? 0 : paid,
        checkoutMode: checkoutMode === "queue" || checkoutMode === "direct" ? checkoutMode : "",
      });
      setCart([]);
      setDiscount(0);
      setCustomerId("");
      setAmountPaid(0);
      setPaidTouched(false);
      setOfflineMessage("Vente enregistrée sur cet appareil. Elle sera envoyée automatiquement dès le retour du réseau.");
    } catch {
      setOfflineMessage("Cette vente n'a pas pu être enregistrée sur l'appareil. Réessayez avant de fermer l'application.");
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-5 pb-24">
      <input type="hidden" name="items" value={JSON.stringify(cart)} />
      <ProductSearch cart={cart} onAdd={addProduct} products={products} />
      <SaleCart
        items={cart}
        error={stockError ?? state.fieldErrors?.items}
        onQuantity={updateQuantity}
        onRemove={(productId) => setCart(cart.filter((item) => item.productId !== productId))}
      />
      <SaleSummary subtotal={subtotal} discount={discount} total={displayTotals.total} />
      <Input
        id="discount"
        name="discount"
        label="Remise"
        type="number"
        inputMode="decimal"
        min={0}
        max={subtotal}
        step="0.01"
        value={discount}
        onChange={(event) => setDiscount(Number(event.target.value) || 0)}
        error={state.fieldErrors?.discount}
      />
      <CustomerPicker customers={customers} value={customerId} onChange={setCustomerId} />
      {requiresCashierCheckout ? (
        <div className="rounded-lg border border-primary/20 bg-primary-soft p-4 text-sm text-primary">
          Cette vente sera envoyée à la caisse. Le caissier, le propriétaire ou le manager choisira le paiement et validera l&apos;encaissement.
          <input type="hidden" name="paymentMethod" value="cash" />
          <input type="hidden" name="amountPaid" value="0" />
        </div>
      ) : (
        <>
          <PaymentSection
            method={paymentMethod}
            amountPaid={paid}
            total={displayTotals.total}
            amountDue={displayTotals.amountDue}
            error={state.fieldErrors?.amountPaid}
            onMethod={setPaymentMethod}
            onAmountPaid={(value) => {
              setPaidTouched(true);
              setAmountPaid(value);
            }}
          />
          <button
            type="button"
            onClick={() => {
              setPaidTouched(true);
              setAmountPaid(displayTotals.total);
            }}
            className="self-start text-sm font-medium text-primary"
          >
            Saisir le total comme montant payé
          </button>
        </>
      )}
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {offlineMessage ? (
        <p role="status" className="rounded-lg bg-primary-soft p-3 text-sm text-primary">
          {offlineMessage}
        </p>
      ) : null}
      <div className="fixed inset-x-0 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom))] z-20 border-t border-border bg-card/95 p-3 backdrop-blur-sm lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        {ownerCanChooseCheckout ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button type="submit" name="checkoutMode" value="queue" variant="outline" size="lg" loading={pending} disabled={cart.length === 0} className="w-full">
              Envoyer à la caisse
            </Button>
            <Button type="submit" name="checkoutMode" value="direct" size="lg" loading={pending} disabled={cart.length === 0} className="w-full">
              Valider la vente
            </Button>
          </div>
        ) : (
          <Button type="submit" size="lg" loading={pending} disabled={cart.length === 0} className="w-full">
            {pending ? "Enregistrement..." : requiresCashierCheckout ? "Envoyer à la caisse" : "Valider la vente"}
          </Button>
        )}
      </div>
    </form>
  );
}
