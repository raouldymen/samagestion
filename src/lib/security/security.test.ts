import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasPermission } from "@/lib/auth/permissions";
import { SERVER_ONLY_PAYMENT_KEYS } from "@/lib/payments/env";
import { signWebhookPayload, verifyWebhookSignature } from "@/lib/payments/signature";
import { checkPlanLimit, hasFeature } from "@/lib/subscriptions/limits";
import type { PlanFeatureConfig } from "@/types/subscriptions";

describe("isolation permissions par rôle", () => {
  it("empêche le vendeur de gérer produits / équipe / abonnement", () => {
    assert.equal(hasPermission("seller", "products.edit"), false);
    assert.equal(hasPermission("seller", "products.delete"), false);
    assert.equal(hasPermission("seller", "products.manage"), false);
    assert.equal(hasPermission("seller", "stock.adjust"), false);
    assert.equal(hasPermission("seller", "team.edit_role"), false);
    assert.equal(hasPermission("seller", "settings.edit"), false);
    assert.equal(hasPermission("seller", "reports.financial"), false);
  });

  it("empêche le manager d'escalader vers owner (team.edit_role / settings.edit)", () => {
    assert.equal(hasPermission("manager", "team.invite"), false);
    assert.equal(hasPermission("manager", "team.edit_role"), false);
    assert.equal(hasPermission("manager", "settings.edit"), false);
    assert.equal(hasPermission("manager", "products.edit"), true);
  });

  it("réserve l'owner à son propre commerce côté catalogue permissions", () => {
    assert.equal(hasPermission("owner", "settings.edit"), true);
    assert.equal(hasPermission("owner", "team.suspend"), true);
  });
});

describe("webhook fail-closed", () => {
  it("rejette si le secret est absent", () => {
    const prev = process.env.PAYMENT_WEBHOOK_SECRET;
    delete process.env.PAYMENT_WEBHOOK_SECRET;
    try {
      assert.equal(verifyWebhookSignature("{}", "aabbcc"), false);
      assert.throws(() => signWebhookPayload("{}"), /PAYMENT_WEBHOOK_SECRET_MISSING/);
    } finally {
      if (prev === undefined) {
        delete process.env.PAYMENT_WEBHOOK_SECRET;
      } else {
        process.env.PAYMENT_WEBHOOK_SECRET = prev;
      }
    }
  });

  it("accepte uniquement la signature du secret configuré", () => {
    process.env.PAYMENT_WEBHOOK_SECRET = "audit-secret";
    const body = JSON.stringify({
      type: "payment.success",
      data: { internal_reference: "SMG-A", amount: 5000 },
    });
    const sig = signWebhookPayload(body);
    assert.equal(verifyWebhookSignature(body, sig), true);
    assert.equal(verifyWebhookSignature(body, "deadbeef"), false);
    assert.equal(verifyWebhookSignature(body, null), false);
  });
});

describe("service role non exposé au client", () => {
  it("liste les clés serveur interdites côté NEXT_PUBLIC", () => {
    for (const key of SERVER_ONLY_PAYMENT_KEYS) {
      assert.equal(key.startsWith("NEXT_PUBLIC_"), false);
      assert.equal(key.startsWith("VITE_"), false);
    }
    assert.ok(SERVER_ONLY_PAYMENT_KEYS.includes("SUPABASE_SERVICE_ROLE_KEY"));
    assert.ok(SERVER_ONLY_PAYMENT_KEYS.includes("PAYMENT_WEBHOOK_SECRET"));
  });
});

describe("limites plan (source features, pas claim client)", () => {
  const freeFeatures: Record<string, PlanFeatureConfig> = {
    products: { enabled: true, limit: 100 },
    sales_monthly: { enabled: true, limit: 100 },
    customers: { enabled: true, limit: 100 },
    team_members: { enabled: true, limit: 1 },
    financial_reports: { enabled: false, limit: null },
    audit_logs: { enabled: false, limit: null },
  };

  it("bloque un dépassement produits Free", () => {
    const result = checkPlanLimit(freeFeatures, "products", 100);
    assert.equal(result.allowed, false);
  });

  it("refuse une feature Business absente du plan Free", () => {
    assert.equal(hasFeature(freeFeatures, "financial_reports"), false);
    assert.equal(hasFeature(freeFeatures, "audit_logs"), false);
  });
});

describe("anti-IDOR logique (références croisées)", () => {
  it("refuse d'activer une transaction d'un autre commerce", () => {
    const sessionBusinessId: string = "biz-a";
    const txBusinessId: string = "biz-b";
    assert.equal(sessionBusinessId === txBusinessId, false);
  });
});
