import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateCustomerForm } from "@/lib/customers/validation";

describe("validation client", () => {
  it("exige un nom", () => {
    const form = new FormData();
    form.set("name", "");
    const result = validateCustomerForm(form);
    assert.ok(result.fieldErrors.name);
  });

  it("accepte un client sénégalais valide", () => {
    const form = new FormData();
    form.set("name", "Moussa Diop");
    form.set("phone", "77 123 45 67");
    form.set("email", "moussa@exemple.sn");
    const result = validateCustomerForm(form);
    assert.equal(result.error, null);
    assert.equal(result.values.name, "Moussa Diop");
  });

  it("refuse un email invalide", () => {
    const form = new FormData();
    form.set("name", "Moussa");
    form.set("email", "pas-un-email");
    const result = validateCustomerForm(form);
    assert.ok(result.fieldErrors.email);
  });
});
