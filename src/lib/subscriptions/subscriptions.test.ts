import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COMPARISON_ROWS,
  FEATURE_LABELS,
  PLAN_FEATURE_KEYS,
  PLAN_SLUGS,
  TRIAL_DAYS,
  isPlanFeatureKey,
  isPlanSlug,
} from "@/lib/subscriptions/constants";
import {
  checkPlanLimit,
  getPlanLimit,
  hasFeature,
  mapFeatureError,
  mapPlanLimitError,
  usageMeters,
} from "@/lib/subscriptions/limits";
import { mapSubscriptionError } from "@/lib/subscriptions/errors";
import { getPaymentProvider } from "@/lib/payments/payment-provider";
import type { PlanFeatureConfig, SubscriptionBundle } from "@/types/subscriptions";

const FREE_FEATURES: Record<string, PlanFeatureConfig> = {
  products: { enabled: true, limit: 300 },
  sales_monthly: { enabled: true, limit: 300 },
  customers: { enabled: true, limit: 300 },
  team_members: { enabled: true, limit: 1 },
  exports: { enabled: false, limit: null },
  financial_reports: { enabled: false, limit: null },
  team_management: { enabled: false, limit: null },
  audit_logs: { enabled: false, limit: null },
  priority_support: { enabled: false, limit: null },
};

const PRO_FEATURES: Record<string, PlanFeatureConfig> = {
  products: { enabled: true, limit: 5000 },
  sales_monthly: { enabled: true, limit: null },
  customers: { enabled: true, limit: null },
  team_members: { enabled: true, limit: 10 },
  exports: { enabled: true, limit: null },
  financial_reports: { enabled: true, limit: null },
  team_management: { enabled: true, limit: null },
  audit_logs: { enabled: false, limit: null },
  priority_support: { enabled: false, limit: null },
};

const BUSINESS_FEATURES: Record<string, PlanFeatureConfig> = {
  ...PRO_FEATURES,
  products: { enabled: true, limit: null },
  team_members: { enabled: true, limit: 20 },
  audit_logs: { enabled: true, limit: null },
  priority_support: { enabled: true, limit: null },
};

function bundleFor(
  features: Record<string, PlanFeatureConfig>,
  usage: Partial<SubscriptionBundle["usage"]> = {},
): SubscriptionBundle {
  return {
    subscription: {
      id: "sub-1",
      businessId: "biz-a",
      planId: "plan-1",
      status: "active",
      startedAt: new Date().toISOString(),
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: null,
      trialStart: null,
      trialEnd: null,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      daysRemaining: null,
      isTrial: false,
      isActive: true,
    },
    plan: {
      id: "plan-1",
      name: "Test",
      slug: "free",
      description: null,
      priceMonthly: 0,
      currency: "XOF",
    },
    features,
    usage: {
      products: 0,
      salesMonthly: 0,
      customers: 0,
      teamMembers: 1,
      ...usage,
    },
  };
}

describe("plans et constantes", () => {
  it("expose free, pro et business", () => {
    assert.deepEqual(PLAN_SLUGS, ["free", "pro", "business"]);
    assert.equal(isPlanSlug("pro"), true);
    assert.equal(isPlanSlug("enterprise"), false);
    assert.equal(TRIAL_DAYS, 14);
  });

  it("connaît les clés de fonctionnalités", () => {
    assert.ok(PLAN_FEATURE_KEYS.includes("products"));
    assert.ok(PLAN_FEATURE_KEYS.includes("financial_reports"));
    assert.equal(isPlanFeatureKey("exports"), true);
    assert.equal(FEATURE_LABELS.sales_monthly, "Ventes ce mois");
    assert.ok(COMPARISON_ROWS.length >= 8);
  });
});

describe("sémantique limites (NULL / 0 / N)", () => {
  it("NULL = illimité même avec usage élevé", () => {
    const unlimited = { products: { enabled: true, limit: null } };
    assert.equal(checkPlanLimit(unlimited, "products", 0).allowed, true);
    assert.equal(checkPlanLimit(unlimited, "products", 100_000).allowed, true);
    assert.equal(getPlanLimit(unlimited, "products"), null);
  });

  it("0 = bloqué dès count >= 0", () => {
    const zero = { products: { enabled: true, limit: 0 } };
    assert.equal(checkPlanLimit(zero, "products", 0).allowed, false);
    assert.equal(getPlanLimit(zero, "products"), 0);
  });

  it("N = bloqué lorsque count >= N", () => {
    const capped = { products: { enabled: true, limit: 100 } };
    assert.equal(checkPlanLimit(capped, "products", 99).allowed, true);
    assert.equal(checkPlanLimit(capped, "products", 100).allowed, false);
  });

  it("feature désactivée ≠ limite numérique (hasFeature)", () => {
    assert.equal(hasFeature(FREE_FEATURES, "exports"), false);
    assert.equal(getPlanLimit(FREE_FEATURES, "exports"), 0);
  });
});

describe("limites Free", () => {
  it("refuse le 301e produit", () => {
    const atLimit = checkPlanLimit(FREE_FEATURES, "products", 300);
    assert.equal(atLimit.allowed, false);
    assert.equal(atLimit.limit, 300);

    const under = checkPlanLimit(FREE_FEATURES, "products", 299);
    assert.equal(under.allowed, true);
  });

  it("refuse la 301e vente mensuelle", () => {
    assert.equal(checkPlanLimit(FREE_FEATURES, "sales_monthly", 300).allowed, false);
    assert.equal(checkPlanLimit(FREE_FEATURES, "sales_monthly", 84).allowed, true);
  });

  it("limite à 1 membre", () => {
    assert.equal(getPlanLimit(FREE_FEATURES, "team_members"), 1);
    assert.equal(checkPlanLimit(FREE_FEATURES, "team_members", 1).allowed, false);
  });

  it("bloque exports et rapports financiers", () => {
    assert.equal(hasFeature(FREE_FEATURES, "exports"), false);
    assert.equal(hasFeature(FREE_FEATURES, "financial_reports"), false);
    assert.equal(hasFeature(FREE_FEATURES, "team_management"), false);
    assert.equal(hasFeature(FREE_FEATURES, "audit_logs"), false);
  });
});

describe("limites Pro / Business", () => {
  it("passe la limite produits à 5000 sur Pro", () => {
    assert.equal(getPlanLimit(PRO_FEATURES, "products"), 5000);
    assert.equal(checkPlanLimit(PRO_FEATURES, "products", 800).allowed, true);
    assert.equal(checkPlanLimit(PRO_FEATURES, "products", 5000).allowed, false);
  });

  it("autorise ventes/clients illimités sur Pro", () => {
    assert.equal(getPlanLimit(PRO_FEATURES, "sales_monthly"), null);
    assert.equal(checkPlanLimit(PRO_FEATURES, "sales_monthly", 50_000).allowed, true);
    assert.equal(hasFeature(PRO_FEATURES, "financial_reports"), true);
    assert.equal(hasFeature(PRO_FEATURES, "exports"), true);
    assert.equal(getPlanLimit(PRO_FEATURES, "team_members"), 10);
  });

  it("réserve l'audit et 20 membres à Business", () => {
    assert.equal(hasFeature(PRO_FEATURES, "audit_logs"), false);
    assert.equal(hasFeature(BUSINESS_FEATURES, "audit_logs"), true);
    assert.equal(getPlanLimit(BUSINESS_FEATURES, "team_members"), 20);
    assert.equal(getPlanLimit(BUSINESS_FEATURES, "products"), null);
  });
});

describe("downgrade sans suppression", () => {
  it("bloque les créations quand l'usage dépasse Free", () => {
    const meters = usageMeters(bundleFor(FREE_FEATURES, { products: 800 }));
    const products = meters.find((m) => m.key === "products");
    assert.ok(products);
    assert.equal(products.blocked, true);
    assert.equal(products.used, 800);
    assert.equal(products.limit, 300);
    // Les 800 produits restent ; seule la création est bloquée.
    assert.equal(checkPlanLimit(FREE_FEATURES, "products", 800).allowed, false);
  });

  it("signale l'approche à 80 %", () => {
    const meters = usageMeters(bundleFor(FREE_FEATURES, { products: 240 }));
    const products = meters.find((m) => m.key === "products");
    assert.equal(products?.warning, true);
    assert.equal(products?.blocked, false);
  });
});

describe("erreurs structurées", () => {
  it("parse PLAN_LIMIT_REACHED", () => {
    const parsed = mapPlanLimitError("PLAN_LIMIT_REACHED:products:100:100");
    assert.deepEqual(parsed, { feature: "products", usage: 100, limit: 100 });
    assert.match(mapSubscriptionError(new Error("PLAN_LIMIT_REACHED:products:100:100")), /Limite/);
  });

  it("parse FEATURE_NOT_AVAILABLE", () => {
    assert.equal(mapFeatureError("FEATURE_NOT_AVAILABLE:financial_reports"), "financial_reports");
    assert.match(
      mapSubscriptionError(new Error("FEATURE_NOT_AVAILABLE:exports")),
      /exports|Exports|Pro/i,
    );
  });
});

describe("paiement abstrait", () => {
  it("expose un provider mock prêt pour le checkout de test", async () => {
    process.env.PAYMENT_PROVIDER = "mock";
    const provider = getPaymentProvider();
    const checkout = await provider.createCheckout({
      businessId: "biz-a",
      planId: "plan-pro",
      planSlug: "pro",
      planName: "Pro",
      amount: 5000,
      currency: "XOF",
      internalReference: "SMG-20260827-TEST01",
      successUrl: "/settings/subscription",
      cancelUrl: "/upgrade",
      environment: "test",
    });
    assert.equal(checkout.ready, true);
    assert.ok(checkout.checkoutUrl);
    assert.equal(checkout.provider, "mock");

    const verify = await provider.verifyPayment({
      provider: "mock",
      providerTransactionId: "tx-1",
    });
    assert.equal(verify.ok, false);
  });

  it("simule l'idempotence via une Map provider+tx", () => {
    const seen = new Map<string, { amount: number; status: string }>();
    function record(provider: string, txId: string, amount: number) {
      const key = `${provider}:${txId}`;
      if (seen.has(key)) {
        return { created: false, row: seen.get(key)! };
      }
      const row = { amount, status: "paid" };
      seen.set(key, row);
      return { created: true, row };
    }

    const first = record("wave", "pay_123", 5000);
    const second = record("wave", "pay_123", 5000);
    assert.equal(first.created, true);
    assert.equal(second.created, false);
    assert.equal(seen.size, 1);
  });
});
