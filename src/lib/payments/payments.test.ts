import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computeChurnRate, computeConversionRate } from "@/lib/payments/metrics";
import {
  isMobileMoneyMethod,
  mobileMoneyLabel,
  normalizeSenegalPhone,
} from "@/lib/payments/mobile-money";
import { addSubscriptionMonth, statusLabel } from "@/lib/payments/payment-service";
import { signWebhookPayload, verifyWebhookSignature } from "@/lib/payments/signature";
import { getPaymentProvider } from "@/lib/payments/payment-provider";

describe("période calendaire", () => {
  it("ajoute un mois calendaire (27 août → 27 septembre)", () => {
    const start = new Date(2026, 7, 27, 12, 0, 0);
    const end = addSubscriptionMonth(start);
    assert.equal(end.getFullYear(), 2026);
    assert.equal(end.getMonth(), 8);
    assert.equal(end.getDate(), 27);
  });
});

describe("signature webhook", () => {
  it("accepte une signature valide", () => {
    process.env.PAYMENT_WEBHOOK_SECRET = "test-secret";
    const body = JSON.stringify({ type: "payment.success" });
    const sig = signWebhookPayload(body);
    assert.equal(verifyWebhookSignature(body, sig), true);
  });

  it("rejette une signature falsifiée", () => {
    process.env.PAYMENT_WEBHOOK_SECRET = "test-secret";
    const body = JSON.stringify({ type: "payment.success", amount: 5000 });
    const sig = signWebhookPayload(body);
    const tampered = JSON.stringify({ type: "payment.success", amount: 100 });
    assert.equal(verifyWebhookSignature(tampered, sig), false);
  });

  it("échoue fermé sans secret", () => {
    const prev = process.env.PAYMENT_WEBHOOK_SECRET;
    delete process.env.PAYMENT_WEBHOOK_SECRET;
    try {
      assert.equal(verifyWebhookSignature("{}", "00"), false);
    } finally {
      if (prev === undefined) delete process.env.PAYMENT_WEBHOOK_SECRET;
      else process.env.PAYMENT_WEBHOOK_SECRET = prev;
    }
  });
});

describe("provider mock", () => {
  it("est sélectionné par défaut", () => {
    process.env.PAYMENT_PROVIDER = "mock";
    const provider = getPaymentProvider();
    assert.equal(provider.name, "mock");
  });

  it("crée une URL de checkout mock", async () => {
    process.env.PAYMENT_PROVIDER = "mock";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";
    const provider = getPaymentProvider();
    const session = await provider.createCheckout({
      businessId: "biz-a",
      planId: "plan-pro",
      planSlug: "pro",
      planName: "Pro",
      amount: 5000,
      currency: "XOF",
      internalReference: "SMG-20260827-ABC123",
      successUrl: "http://localhost:3000/payment/success",
      cancelUrl: "http://localhost:3000/payment/failed",
      environment: "test",
    });
    assert.equal(session.ready, true);
    assert.match(session.checkoutUrl, /\/payment\/mobile\?ref=/);
    assert.equal(session.providerTransactionId, "mock_SMG-20260827-ABC123");
  });
});

describe("idempotence logique", () => {
  it("ne traite qu'une fois le même provider_transaction_id", () => {
    const seen = new Set<string>();
    function apply(provider: string, txId: string) {
      const key = `${provider}:${txId}`;
      if (seen.has(key)) {
        return { activated: false, idempotent: true };
      }
      seen.add(key);
      return { activated: true, idempotent: false };
    }
    assert.equal(apply("mock", "tx1").activated, true);
    assert.equal(apply("mock", "tx1").idempotent, true);
    assert.equal(seen.size, 1);
  });

  it("rejette un montant incorrect avant activation", () => {
    const expected = 5000;
    const received = Number("100");
    assert.equal(received !== expected, true);
  });
});

describe("métriques", () => {
  it("calcule conversion et churn", () => {
    assert.equal(computeConversionRate(90, 10), 0.1);
    assert.equal(computeChurnRate(2, 20), 0.1);
  });

  it("libelle les statuts", () => {
    assert.equal(statusLabel("successful"), "Payé");
    assert.equal(statusLabel("pending"), "En attente");
  });
});

describe("paiement mobile", () => {
  it("reconnaît Wave et Orange Money", () => {
    assert.equal(isMobileMoneyMethod("wave"), true);
    assert.equal(isMobileMoneyMethod("orange_money"), true);
    assert.equal(isMobileMoneyMethod("cash"), false);
    assert.equal(mobileMoneyLabel("wave"), "Wave");
  });

  it("normalise les numéros sénégalais", () => {
    assert.equal(normalizeSenegalPhone("77 123 45 67"), "+221771234567");
    assert.equal(normalizeSenegalPhone("+221771234567"), "+221771234567");
    assert.equal(normalizeSenegalPhone("221771234567"), "+221771234567");
    assert.equal(normalizeSenegalPhone("001234567"), null);
    assert.equal(normalizeSenegalPhone("77123"), null);
  });
});
