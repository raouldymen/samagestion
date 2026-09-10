import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cartSubtotal, paymentStatusFromAmounts, saleTotals } from "./constants";
import { mapSaleError } from "./errors";
import { validateSaleForm } from "./validation";

describe("totaux de vente", () => {
  it("calcule une vente simple", () => {
    const totals = saleTotals(15000, 0, 15000);
    assert.equal(totals.total, 15000);
    assert.equal(totals.amountDue, 0);
    assert.equal(totals.paymentStatus, "paid");
  });

  it("calcule une vente multiple", () => {
    const subtotal = cartSubtotal([
      { quantity: 2, unitPrice: 15000 },
      { quantity: 1, unitPrice: 10000 },
    ]);
    assert.equal(subtotal, 40000);
  });

  it("applique une remise", () => {
    const totals = saleTotals(40000, 5000, 35000);
    assert.equal(totals.total, 35000);
    assert.equal(totals.amountDue, 0);
  });

  it("marque un paiement partiel", () => {
    const totals = saleTotals(40000, 0, 25000);
    assert.equal(totals.amountDue, 15000);
    assert.equal(totals.paymentStatus, "partial");
  });

  it("marque un impayé", () => {
    const totals = saleTotals(40000, 0, 0);
    assert.equal(totals.amountDue, 40000);
    assert.equal(totals.paymentStatus, "unpaid");
  });
});

describe("statuts de paiement", () => {
  it("paid / partial / unpaid", () => {
    assert.equal(paymentStatusFromAmounts(100, 100, 0), "paid");
    assert.equal(paymentStatusFromAmounts(100, 40, 60), "partial");
    assert.equal(paymentStatusFromAmounts(100, 0, 100), "unpaid");
  });
});

describe("validation", () => {
  it("refuse un panier vide", () => {
    const form = new FormData();
    form.set("items", "[]");
    form.set("discount", "0");
    form.set("amountPaid", "0");
    form.set("paymentMethod", "cash");

    const result = validateSaleForm(form);
    assert.ok(result.fieldErrors.items);
  });

  it("refuse une quantité supérieure au stock", () => {
    const form = new FormData();
    form.set(
      "items",
      JSON.stringify([
        {
          productId: "p1",
          name: "Jean",
          unitPrice: 15000,
          stockQuantity: 3,
          quantity: 5,
        },
      ]),
    );
    form.set("discount", "0");
    form.set("amountPaid", "0");
    form.set("paymentMethod", "cash");

    const result = validateSaleForm(form);
    assert.match(result.fieldErrors.items ?? "", /Stock insuffisant/);
  });

  it("refuse une remise supérieure au sous-total", () => {
    const form = new FormData();
    form.set(
      "items",
      JSON.stringify([
        { productId: "p1", name: "Jean", unitPrice: 15000, stockQuantity: 5, quantity: 1 },
      ]),
    );
    form.set("discount", "20000");
    form.set("amountPaid", "0");
    form.set("paymentMethod", "cash");

    const result = validateSaleForm(form);
    assert.ok(result.fieldErrors.discount);
  });

  it("refuse un paiement supérieur au total", () => {
    const form = new FormData();
    form.set(
      "items",
      JSON.stringify([
        { productId: "p1", name: "Jean", unitPrice: 15000, stockQuantity: 5, quantity: 1 },
      ]),
    );
    form.set("discount", "0");
    form.set("amountPaid", "20000");
    form.set("paymentMethod", "cash");

    const result = validateSaleForm(form);
    assert.ok(result.fieldErrors.amountPaid);
  });
});

describe("erreurs", () => {
  it("traduit INSUFFICIENT_STOCK avec le stock disponible", () => {
    assert.equal(
      mapSaleError(new Error("INSUFFICIENT_STOCK:3")),
      "Stock insuffisant. Stock disponible : 3",
    );
  });
});
