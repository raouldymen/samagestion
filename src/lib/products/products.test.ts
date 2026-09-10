import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getStockStatus } from "./constants";
import { mapProductError } from "./errors";
import { nextStock } from "./stock";
import { validateProductForm, validateStockAdjustment } from "./validation";

describe("getStockStatus", () => {
  it("affiche Disponible au-dessus du seuil", () => {
    assert.equal(getStockStatus(24, 5), "in_stock");
  });

  it("affiche Stock faible lorsque stock <= minimum", () => {
    assert.equal(getStockStatus(5, 5), "low");
    assert.equal(getStockStatus(3, 5), "low");
  });

  it("affiche Rupture lorsque le stock est à 0", () => {
    assert.equal(getStockStatus(0, 5), "out");
  });
});

describe("stock", () => {
  it("ajoute du stock : 10 + 5 = 15", () => {
    assert.deepEqual(nextStock(10, 5), {
      ok: true,
      previousStock: 10,
      quantity: 5,
      newStock: 15,
    });
  });

  it("retire du stock : 15 - 3 = 12", () => {
    assert.deepEqual(nextStock(15, -3), {
      ok: true,
      previousStock: 15,
      quantity: -3,
      newStock: 12,
    });
  });

  it("refuse un retrait supérieur au stock disponible", () => {
    assert.deepEqual(nextStock(12, -20), {
      ok: false,
      error: "Stock insuffisant.",
      stock: 12,
    });
  });
});

describe("validation produit", () => {
  it("exige un nom et des montants positifs", () => {
    const form = new FormData();
    form.set("name", "");
    form.set("purchasePrice", "-1");
    form.set("sellingPrice", "-4");
    form.set("initialStock", "-2");
    form.set("minimumStock", "-1");
    form.set("unit", "piece");

    const result = validateProductForm(form, "create");

    assert.equal(result.error, "Veuillez corriger les champs indiqués.");
    assert.equal(result.fieldErrors.name, "Le nom du produit est obligatoire.");
    assert.equal(
      result.fieldErrors.purchasePrice,
      "Le prix d'achat doit être supérieur ou égal à 0.",
    );
    assert.equal(
      result.fieldErrors.sellingPrice,
      "Le prix de vente doit être supérieur ou égal à 0.",
    );
    assert.equal(
      result.fieldErrors.initialStock,
      "Le stock initial doit être supérieur ou égal à 0.",
    );
    assert.equal(
      result.fieldErrors.minimumStock,
      "Le stock minimum doit être supérieur ou égal à 0.",
    );
  });

  it("accepte un produit valide", () => {
    const form = new FormData();
    form.set("name", "Jean Zara");
    form.set("purchasePrice", "10000");
    form.set("sellingPrice", "15000");
    form.set("initialStock", "10");
    form.set("minimumStock", "2");
    form.set("unit", "piece");
    form.set("sku", "JZ-001");

    const result = validateProductForm(form, "create");

    assert.equal(result.error, null);
    assert.equal(result.values.name, "Jean Zara");
    assert.equal(result.values.initialStock, 10);
  });
});

describe("validation stock", () => {
  it("exige une quantité positive et un motif", () => {
    const form = new FormData();
    form.set("direction", "remove");
    form.set("quantity", "0");
    form.set("reason", "");

    const result = validateStockAdjustment(form);

    assert.ok(result.fieldErrors.quantity);
    assert.ok(result.fieldErrors.reason);
  });
});

describe("erreurs", () => {
  it("traduit INSUFFICIENT_STOCK", () => {
    assert.equal(mapProductError(new Error("INSUFFICIENT_STOCK")), "Stock insuffisant.");
  });
});
