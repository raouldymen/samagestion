import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateExpenseForm } from "./validation";

describe("validation des dépenses", () => {
  it("refuse une description vide", () => {
    const form = new FormData();
    form.set("description", "");
    form.set("categoryId", "cat-1");
    form.set("amount", "15000");
    form.set("paymentMethod", "cash");
    form.set("expenseDate", "2026-08-27");

    const result = validateExpenseForm(form, "create");
    assert.ok(result.fieldErrors.description);
  });

  it("refuse un montant inférieur ou égal à 0", () => {
    const form = new FormData();
    form.set("description", "Transport");
    form.set("categoryId", "cat-1");
    form.set("amount", "0");
    form.set("paymentMethod", "cash");
    form.set("expenseDate", "2026-08-27");

    const result = validateExpenseForm(form, "create");
    assert.ok(result.fieldErrors.amount);
  });

  it("refuse une catégorie manquante", () => {
    const form = new FormData();
    form.set("description", "Transport");
    form.set("amount", "15000");
    form.set("paymentMethod", "cash");
    form.set("expenseDate", "2026-08-27");

    const result = validateExpenseForm(form, "create");
    assert.ok(result.fieldErrors.categoryId);
  });

  it("accepte une dépense valide", () => {
    const form = new FormData();
    form.set("description", "Transport marchandises");
    form.set("categoryId", "cat-1");
    form.set("amount", "15000");
    form.set("paymentMethod", "cash");
    form.set("expenseDate", "2026-08-27");

    const result = validateExpenseForm(form, "create");
    assert.equal(result.error, null);
    assert.equal(result.values.amount, 15000);
  });
});
