"use client";

import { useActionState, useState } from "react";
import { PaymentSection } from "@/components/sales/payment-section";
import { PurchaseCart } from "@/components/purchases/purchase-cart";
import { PurchaseProductSearch } from "@/components/purchases/purchase-product-search";
import { PurchaseSummary } from "@/components/purchases/purchase-summary";
import { SupplierSelector } from "@/components/purchases/supplier-selector";
import { Button } from "@/components/ui/button";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import { createPurchaseAction } from "@/lib/purchases/actions";
import { purchaseCartSubtotal, purchaseTotals } from "@/lib/purchases/constants";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import type { PaymentMethod, PurchaseCartLine, PurchaseProductOption, Supplier } from "@/types/purchases";

function todayInDakar() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Dakar" }).format(new Date());
}

export function PurchaseForm({
  suppliers,
  initialProduct,
}: {
  suppliers: Supplier[];
  initialProduct?: PurchaseProductOption | null;
}) {
  const [cart, setCart] = useState<PurchaseCartLine[]>(
    initialProduct
      ? [
          {
            productId: initialProduct.id,
            name: initialProduct.name,
            unitCost: initialProduct.purchasePrice,
            stockQuantity: initialProduct.stockQuantity,
            quantity: 1,
          },
        ]
      : [],
  );
  const [discount, setDiscount] = useState(0);
  const [supplierId, setSupplierId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [amountPaid, setAmountPaid] = useState(0);
  const [paidTouched, setPaidTouched] = useState(false);
  const [purchaseDate, setPurchaseDate] = useState(todayInDakar);
  const [dueDate, setDueDate] = useState("");
  const [state, formAction, pending] = useActionState(createPurchaseAction, { error: null });

  const subtotal = purchaseCartSubtotal(cart);
  const baseTotal = purchaseTotals(subtotal, discount, 0).total;
  const paid = paidTouched ? amountPaid : baseTotal;
  const displayTotals = purchaseTotals(subtotal, discount, paid);

  function addProduct(product: PurchaseProductOption) {
    const existing = cart.find((item) => item.productId === product.id);

    if (existing) {
      setCart(
        cart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, stockQuantity: product.stockQuantity }
            : item,
        ),
      );
      return;
    }

    setCart([
      ...cart,
      {
        productId: product.id,
        name: product.name,
        unitCost: product.purchasePrice,
        stockQuantity: product.stockQuantity,
        quantity: 1,
      },
    ]);
  }

  function updateQuantity(productId: string, quantity: number) {
    if (quantity <= 0) {
      setCart(cart.filter((line) => line.productId !== productId));
      return;
    }

    setCart(cart.map((line) => (line.productId === productId ? { ...line, quantity } : line)));
  }

  return (
    <form action={formAction} className="flex flex-col gap-5 pb-24">
      <input type="hidden" name="items" value={JSON.stringify(cart)} />
      <SupplierSelector suppliers={suppliers} value={supplierId} onChange={setSupplierId} />
      <PurchaseProductSearch cart={cart} onAdd={addProduct} />
      <PurchaseCart
        items={cart}
        error={state.fieldErrors?.items}
        onQuantity={updateQuantity}
        onCost={(productId, unitCost) =>
          setCart(cart.map((line) => (line.productId === productId ? { ...line, unitCost } : line)))
        }
        onRemove={(productId) => setCart(cart.filter((item) => item.productId !== productId))}
      />
      <PurchaseSummary subtotal={subtotal} discount={discount} total={displayTotals.total} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <DateInput
          id="purchaseDate"
          name="purchaseDate"
          label="Date"
          required
          value={purchaseDate}
          onChange={(event) => setPurchaseDate(event.target.value)}
          error={state.fieldErrors?.purchaseDate}
          showToday
        />
      </div>
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
      {displayTotals.amountDue > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2"><p className="self-end text-sm font-medium">Dette fournisseur : {formatFcfaAbsolute(displayTotals.amountDue)}</p><DateInput id="dueDate" name="dueDate" label="Échéance de paiement" value={dueDate} onChange={(event) => setDueDate(event.target.value)} min={purchaseDate} /></div>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" loading={pending} disabled={cart.length === 0}>
        {pending ? "Enregistrement..." : "Enregistrer l'achat"}
      </Button>
    </form>
  );
}
