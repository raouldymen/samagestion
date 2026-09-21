/**
 * PayDunya — Payment And Redirection (PAR).
 *
 * Doc : https://developers.paydunya.com/doc/EN/http_json
 * - Checkout POST JSON → sandbox-api ou api /v1/checkout-invoice/create
 * - Confirm GET /v1/checkout-invoice/confirm/{token}
 * - IPN POST application/x-www-form-urlencoded, hash = SHA-512(MasterKey)
 * - Devise : XOF (FCFA) — pas de champ currency dans l'invoice
 * - Moyens SN : wave-senegal, orange-money-senegal
 * - Récurrent : non (un checkout par période)
 */

import {
  getPaymentEnv,
  getPaydunyaMasterKey,
  getPaydunyaPrivateKey,
  getPaydunyaToken,
  getSiteUrl,
} from "@/lib/payments/env";
import { emitPaymentLifecycleEvent } from "@/lib/payments/events";
import { paymentLog } from "@/lib/payments/logger";
import { createServiceClient, isServiceRoleConfigured } from "@/lib/payments/service-client";
import {
  mapPaydunyaStatus,
  parsePaydunyaIpn,
  paydunyaModeToEnvironment,
  verifyPaydunyaHash,
} from "@/lib/payments/providers/paydunya-ipn";
import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  PaymentProvider,
  VerifyPaymentInput,
  VerifyPaymentResult,
  WebhookHandleResult,
} from "@/lib/payments/types";

const PROVIDER = "paydunya";

function paydunyaBaseUrl(environment: CheckoutSessionInput["environment"]) {
  return environment === "production"
    ? "https://app.paydunya.com/api/v1"
    : "https://app.paydunya.com/sandbox-api/v1";
}

function requireKeys() {
  const masterKey = getPaydunyaMasterKey();
  const privateKey = getPaydunyaPrivateKey();
  const token = getPaydunyaToken();
  if (!masterKey || !privateKey || !token) {
    throw new Error("PROVIDER_NOT_CONFIGURED:paydunya");
  }
  return { masterKey, privateKey, token };
}

function authHeaders(keys: { masterKey: string; privateKey: string; token: string }) {
  return {
    "Content-Type": "application/json",
    "PAYDUNYA-MASTER-KEY": keys.masterKey,
    "PAYDUNYA-PRIVATE-KEY": keys.privateKey,
    "PAYDUNYA-TOKEN": keys.token,
  };
}

function assertKeyMode(privateKey: string, environment: CheckoutSessionInput["environment"]) {
  const isTestKey = privateKey.startsWith("test_private_");
  const isLiveKey = privateKey.startsWith("live_private_");
  if (environment === "production" && !isLiveKey) {
    throw new Error("PAYDUNYA_LIVE_KEYS_REQUIRED");
  }
  if (environment === "test" && isLiveKey) {
    throw new Error("PAYDUNYA_TEST_KEYS_REQUIRED");
  }
  if (!isTestKey && !isLiveKey) {
    throw new Error("PAYDUNYA_KEYS_INVALID");
  }
}

type ConfirmResponse = {
  response_code?: string;
  hash?: string;
  status?: string;
  mode?: string;
  invoice?: { token?: string; total_amount?: number | string };
  custom_data?: { internal_reference?: string };
};

async function confirmInvoice(token: string, environment: CheckoutSessionInput["environment"]) {
  const keys = requireKeys();
  const res = await fetch(`${paydunyaBaseUrl(environment)}/checkout-invoice/confirm/${encodeURIComponent(token)}`, {
    method: "GET",
    headers: authHeaders(keys),
  });
  const body = (await res.json()) as ConfirmResponse;
  if (!res.ok || body.response_code !== "00") {
    return null;
  }
  if (!body.hash || !verifyPaydunyaHash(body.hash, keys.masterKey)) {
    return null;
  }
  return body;
}

export const paydunyaPaymentProvider: PaymentProvider = {
  name: PROVIDER,

  async createCheckout(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    if (input.currency !== "XOF") {
      throw new Error("UNSUPPORTED_CURRENCY");
    }

    const keys = requireKeys();
    assertKeyMode(keys.privateKey, input.environment);

    const payload = {
      invoice: {
        total_amount: Math.round(input.amount),
        description: `Abonnement ${input.planName} — ${input.internalReference}`,
        channels: ["wave-senegal", "orange-money-senegal"],
      },
      store: {
        name: "SamaGestion",
        website_url: getSiteUrl(),
      },
      custom_data: {
        internal_reference: input.internalReference,
        business_id: input.businessId,
        plan_id: input.planId,
      },
      actions: {
        return_url: input.successUrl,
        cancel_url: input.cancelUrl,
        callback_url: `${getSiteUrl()}/api/webhooks/payments`,
      },
    };

    const res = await fetch(`${paydunyaBaseUrl(input.environment)}/checkout-invoice/create`, {
      method: "POST",
      headers: authHeaders(keys),
      body: JSON.stringify(payload),
    });

    const body = (await res.json()) as {
      response_code?: string;
      response_text?: string;
      token?: string;
    };

    if (!res.ok || body.response_code !== "00" || !body.token || !body.response_text) {
      paymentLog("webhook_rejected", {
        provider: PROVIDER,
        reason: body.response_text ?? "CHECKOUT_FAILED",
      });
      throw new Error(body.response_text ?? "PAYDUNYA_CHECKOUT_FAILED");
    }

    paymentLog("checkout_created", {
      provider: PROVIDER,
      reference: input.internalReference,
      amount: input.amount,
      plan: input.planSlug,
      environment: input.environment,
    });

    return {
      provider: PROVIDER,
      checkoutUrl: body.response_text,
      providerTransactionId: body.token,
      ready: true,
    };
  },

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    const environment = getPaymentEnv();
    const confirmed = await confirmInvoice(input.providerTransactionId, environment);
    if (!confirmed) {
      return { ok: false, status: "unknown" };
    }

    const status = mapPaydunyaStatus(confirmed.status ?? "");
    const amount = Number(confirmed.invoice?.total_amount ?? 0);

    return {
      ok: status === "successful",
      status: status === "unknown" ? "unknown" : status,
      amount,
      currency: "XOF",
      internalReference: confirmed.custom_data?.internal_reference,
    };
  },

  async handleWebhook(rawBody: string, headers: Headers): Promise<WebhookHandleResult> {
    paymentLog("webhook_received", { provider: PROVIDER });

    const masterKey = getPaydunyaMasterKey();
    if (!masterKey) {
      return { ok: false, error: "PROVIDER_NOT_CONFIGURED:paydunya" };
    }

    const ipn = parsePaydunyaIpn(rawBody, headers.get("content-type") ?? "");
    if (!ipn) {
      return { ok: false, error: "INVALID_IPN" };
    }

    if (!verifyPaydunyaHash(ipn.hash, masterKey)) {
      paymentLog("webhook_rejected", { reason: "invalid_hash", provider: PROVIDER });
      return { ok: false, error: "INVALID_SIGNATURE" };
    }

    const mapped = mapPaydunyaStatus(ipn.status);
    if (mapped === "pending" || mapped === "unknown") {
      return { ok: true, ignored: true, eventType: "payment.pending" };
    }

    const environment = paydunyaModeToEnvironment(ipn.mode);
    if (getPaymentEnv() === "production" && environment !== "production") {
      return { ok: false, error: "ENVIRONMENT_MISMATCH" };
    }

    const confirmed = await confirmInvoice(ipn.token, environment);
    if (!confirmed) {
      return { ok: false, error: "CONFIRM_FAILED" };
    }

    const confirmedStatus = mapPaydunyaStatus(confirmed.status ?? ipn.status);
    const amount = Number(confirmed.invoice?.total_amount ?? ipn.amount);
    const internalReference =
      confirmed.custom_data?.internal_reference || ipn.internalReference;

    if (!internalReference) {
      return { ok: false, error: "MISSING_REFERENCE" };
    }

    if (!isServiceRoleConfigured()) {
      return { ok: false, error: "SERVICE_ROLE_NOT_CONFIGURED" };
    }

    const supabase = createServiceClient();
    const eventType =
      confirmedStatus === "successful" ? "payment.success" : "payment.failed";

    const { data, error } = await supabase.rpc("confirm_subscription_payment", {
      p_internal_reference: internalReference,
      p_provider: PROVIDER,
      p_provider_transaction_id: ipn.token,
      p_amount: amount,
      p_currency: "XOF",
      p_status: confirmedStatus === "unknown" ? "failed" : confirmedStatus,
      p_event_type: eventType,
      p_environment: environment,
      p_metadata: { source: "paydunya_ipn", mode: ipn.mode },
    });

    if (error) {
      paymentLog("webhook_rejected", { reason: error.message, provider: PROVIDER });
      return { ok: false, error: error.message };
    }

    const activated =
      data && typeof data === "object" && "activated" in data && Boolean(data.activated);

    if (activated) {
      paymentLog("subscription_activated", { reference: internalReference });
      emitPaymentLifecycleEvent("subscription.payment_success", {
        reference: internalReference,
      });
    } else if (confirmedStatus === "failed" || confirmedStatus === "cancelled") {
      paymentLog("payment_failed", { reference: internalReference });
      emitPaymentLifecycleEvent("subscription.payment_failed", {
        reference: internalReference,
      });
    }

    return { ok: true, eventType, result: data };
  },

  async cancelSubscription() {
    return { ok: false };
  },
};
