import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nextStock } from "@/lib/products/stock";
import { purchaseCartSubtotal, purchaseTotals } from "./constants";
import { mapPurchaseError } from "./errors";
import { validatePurchaseForm } from "./validation";

describe("totaux d'achat", () => {
  it("calcule un achat simple", () => {
    const totals = purchaseTotals(100_000, 0, 40_000);
    assert.equal(totals.total, 100_000);
    assert.equal(totals.amountDue, 60_000);
    assert.equal(totals.paymentStatus, "partial");
  });

  it("calcule un achat multiple", () => {
    const subtotal = purchaseCartSubtotal([
      { productId: "a", name: "A", unitCost: 10_000, stockQuantity: 0, quantity: 10 },
      { productId: "b", name: "B", unitCost: 7_000, stockQuantity: 0, quantity: 5 },
    ]);
    assert.equal(subtotal, 135_000);
  });
});

describe("stock après achat / annulation", () => {
  it("ajoute le stock : 10 + 5 = 15", () => {
    const added = nextStock(10, 5);
    assert.equal(added.ok, true);
    if (added.ok) {
      assert.equal(added.newStock, 15);
    }
  });

  it("restaure le stock à l'annulation : 15 - 5 = 10", () => {
    const restored = nextStock(15, -5);
    assert.equal(restored.ok, true);
    if (restored.ok) {
      assert.equal(restored.newStock, 10);
    }
  });

  it("refuse une annulation qui créerait un stock négatif", () => {
    const refused = nextStock(3, -5);
    assert.equal(refused.ok, false);
  });
});

describe("validation achat", () => {
  it("refuse un panier vide", () => {
    const form = new FormData();
    form.set("items", "[]");
    form.set("discount", "0");
    form.set("amountPaid", "0");
    form.set("paymentMethod", "cash");
    form.set("purchaseDate", "2026-08-27");

    const result = validatePurchaseForm(form);
    assert.ok(result.fieldErrors.items);
  });

  it("accepte un coût d'achat différent du prix catalogue", () => {
    const form = new FormData();
    form.set(
      "items",
      JSON.stringify([
        { productId: "p1", name: "Jean", unitCost: 9500, stockQuantity: 10, quantity: 5 },
      ]),
    );
    form.set("discount", "0");
    form.set("amountPaid", "47500");
    form.set("paymentMethod", "cash");
    form.set("purchaseDate", "2026-08-27");

    const result = validatePurchaseForm(form);
    assert.equal(result.error, null);
    assert.equal(result.values.items[0]?.unitCost, 9500);
    assert.equal(result.totals.total, 47_500);
  });
});

describe("erreurs", () => {
  it("explique un stock insuffisant à l'annulation", () => {
    assert.match(mapPurchaseError(new Error("INSUFFICIENT_STOCK:3")), /Stock disponible : 3/);
  });
});
