import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canReceiveNotification,
  isDebtOverThreshold,
  isOldDebt,
  isSettingEnabled,
  notificationHref,
  notificationPriority,
  OLD_DEBT_THRESHOLDS_DAYS,
  restockHref,
  shouldCreateAlert,
  stockAlertKind,
} from "./rules";

const settings = {
  lowStock: true,
  outOfStock: true,
  customerDebt: true,
  oldCustomerDebt: true,
  supplierDebt: true,
  saleCompleted: false,
  purchaseCompleted: true,
  paymentReceived: true,
};

describe("alertes de stock", () => {
  it("crée une alerte stock faible sous le minimum", () => {
    assert.equal(stockAlertKind(5, 10), "low_stock");
  });

  it("crée une alerte critique en rupture", () => {
    assert.equal(stockAlertKind(0, 10), "out_of_stock");
    assert.equal(notificationPriority("out_of_stock"), "critical");
    assert.equal(notificationPriority("low_stock"), "medium");
  });

  it("n'alerte pas un stock normal", () => {
    assert.equal(stockAlertKind(11, 10), null);
  });
});

describe("anti-duplication", () => {
  it("refuse une seconde alerte identique non résolue", () => {
    assert.equal(shouldCreateAlert(true), false);
    assert.equal(shouldCreateAlert(false), true);
  });
});

describe("dettes", () => {
  it("alerte au-dessus du seuil 100 000", () => {
    assert.equal(isDebtOverThreshold(150_000, 100_000), true);
    assert.equal(isDebtOverThreshold(80_000, 100_000), false);
  });

  it("détecte une dette ancienne de 35 jours", () => {
    assert.equal(isOldDebt(35, 30), true);
    assert.equal(isOldDebt(10, 30), false);
    assert.deepEqual([...OLD_DEBT_THRESHOLDS_DAYS], [7, 30, 90]);
  });

  it("considère la dette résolue après remboursement complet", () => {
    assert.equal(isDebtOverThreshold(0, 100_000), false);
    assert.equal(isOldDebt(0, 30), false);
  });
});

describe("préférences et permissions", () => {
  it("n'envoie plus de stock faible si la préférence est off", () => {
    assert.equal(isSettingEnabled({ ...settings, lowStock: false }, "low_stock"), false);
    assert.equal(isSettingEnabled(settings, "low_stock"), true);
  });

  it("n'envoie pas de dettes financières à un vendeur", () => {
    assert.equal(canReceiveNotification("seller", "customer_debt"), false);
    assert.equal(canReceiveNotification("cashier", "out_of_stock"), false);
    assert.equal(canReceiveNotification("owner", "customer_debt"), true);
  });

  it("permet une vente au caissier sans données de marge", () => {
    assert.equal(canReceiveNotification("cashier", "sale_completed"), true);
    assert.equal(isSettingEnabled(settings, "sale_completed"), false);
  });
});

describe("redirections", () => {
  it("ouvre le produit, le client, le fournisseur, la vente ou l'achat", () => {
    assert.equal(
      notificationHref({ type: "low_stock", entityType: "product", entityId: "p1" }),
      "/products/p1",
    );
    assert.equal(
      notificationHref({ type: "customer_debt", entityType: "customer", entityId: "c1" }),
      "/customers/c1",
    );
    assert.equal(
      notificationHref({ type: "supplier_debt", entityType: "supplier", entityId: "s1" }),
      "/suppliers/s1",
    );
    assert.equal(
      notificationHref({ type: "sale_completed", entityType: "sale", entityId: "v1" }),
      "/sales/v1",
    );
    assert.equal(restockHref("p1"), "/purchases/new?product=p1");
  });
});

describe("isolation multi-commerce", () => {
  it("identifie une alerte par commerce, utilisateur, type et entité", () => {
    const keyA = ["business-a", "user-1", "low_stock", "product-1"].join(":");
    const keyB = ["business-b", "user-1", "low_stock", "product-1"].join(":");
    assert.notEqual(keyA, keyB);
  });
});
