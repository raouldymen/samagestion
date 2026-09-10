import { getSiteUrl } from "@/lib/payments/env";
import { paymentLog } from "@/lib/payments/logger";
import { verifyWebhookSignature } from "@/lib/payments/signature";
import { createServiceClient, isServiceRoleConfigured } from "@/lib/payments/service-client";
import type {
  CheckoutSessionInput,
  CheckoutSessionResult,
  PaymentProvider,
  VerifyPaymentInput,
  VerifyPaymentResult,
  WebhookHandleResult,
} from "@/lib/payments/types";
import { emitPaymentLifecycleEvent } from "@/lib/payments/events";

type MockWebhookBody = {
  type: string;
  data: {
    internal_reference: string;
    provider_transaction_id: string;
    amount: number;
    currency: string;
    status: "successful" | "failed" | "cancelled";
    environment: "test" | "production";
    business_id?: string;
  };
};

/**
 * Prestataire de test — aucun argent réel.
 * Checkout → page /payment/mobile (Wave / Orange Money) puis confirmation mock.
 */
export const mockPaymentProvider: PaymentProvider = {
  name: "mock",

  async createCheckout(input: CheckoutSessionInput): Promise<CheckoutSessionResult> {
    const providerTransactionId = `mock_${input.internalReference}`;
    const checkoutUrl = `${getSiteUrl()}/payment/mobile?ref=${encodeURIComponent(input.internalReference)}`;

    paymentLog("checkout_created", {
      provider: "mock",
      reference: input.internalReference,
      amount: input.amount,
      plan: input.planSlug,
      environment: input.environment,
    });

    return {
      provider: "mock",
      checkoutUrl,
      providerTransactionId,
      ready: true,
    };
  },

  async verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
    if (!isServiceRoleConfigured()) {
      return { ok: false, status: "unknown" };
    }

    const supabase = createServiceClient();
    const { data } = await supabase
      .from("subscription_transactions")
      .select("status, amount, currency, internal_reference, provider_transaction_id")
      .eq("provider", "mock")
      .eq("provider_transaction_id", input.providerTransactionId)
      .maybeSingle();

    if (!data) {
      return { ok: false, status: "unknown" };
    }

    return {
      ok: data.status === "successful",
      status: data.status as VerifyPaymentResult["status"],
      amount: Number(data.amount),
      currency: data.currency,
      internalReference: data.internal_reference ?? undefined,
    };
  },

  async handleWebhook(rawBody: string, headers: Headers): Promise<WebhookHandleResult> {
    paymentLog("webhook_received", { provider: "mock" });

    const signature =
      headers.get("x-samagestion-signature") ?? headers.get("x-webhook-signature");

    if (!verifyWebhookSignature(rawBody, signature)) {
      paymentLog("webhook_rejected", { reason: "invalid_signature", provider: "mock" });
      return { ok: false, error: "INVALID_SIGNATURE" };
    }

    let body: MockWebhookBody;
    try {
      body = JSON.parse(rawBody) as MockWebhookBody;
    } catch {
      return { ok: false, error: "INVALID_JSON" };
    }

    if (!body?.data?.internal_reference) {
      return { ok: false, error: "MISSING_REFERENCE" };
    }

    if (!isServiceRoleConfigured()) {
      return { ok: false, error: "SERVICE_ROLE_NOT_CONFIGURED" };
    }

    const supabase = createServiceClient();
    const eventType = body.type || "payment.success";

    if (eventType === "subscription.renewed" && body.data.business_id) {
      const { data, error } = await supabase.rpc("renew_subscription_period", {
        p_business_id: body.data.business_id,
        p_provider: "mock",
        p_provider_transaction_id: body.data.provider_transaction_id,
        p_amount: body.data.amount,
        p_currency: body.data.currency,
        p_environment: body.data.environment,
        p_metadata: { source: "mock_webhook" },
      });

      if (error) {
        paymentLog("webhook_rejected", { reason: error.message, provider: "mock" });
        return { ok: false, error: error.message };
      }

      paymentLog("subscription_renewed", {
        reference: body.data.internal_reference,
      });
      emitPaymentLifecycleEvent("subscription.renewed", {
        reference: body.data.internal_reference,
      });
      return { ok: true, eventType, result: data };
    }

    const { data, error } = await supabase.rpc("confirm_subscription_payment", {
      p_internal_reference: body.data.internal_reference,
      p_provider: "mock",
      p_provider_transaction_id: body.data.provider_transaction_id,
      p_amount: body.data.amount,
      p_currency: body.data.currency,
      p_status: body.data.status,
      p_event_type: eventType,
      p_environment: body.data.environment,
      p_metadata: { source: "mock_webhook" },
    });

    if (error) {
      paymentLog("webhook_rejected", { reason: error.message, provider: "mock" });
      return { ok: false, error: error.message };
    }

    const activated =
      data && typeof data === "object" && "activated" in data && Boolean(data.activated);

    if (activated) {
      paymentLog("subscription_activated", {
        reference: body.data.internal_reference,
      });
      emitPaymentLifecycleEvent("subscription.payment_success", {
        reference: body.data.internal_reference,
      });
    } else if (body.data.status === "failed") {
      paymentLog("payment_failed", { reference: body.data.internal_reference });
      emitPaymentLifecycleEvent("subscription.payment_failed", {
        reference: body.data.internal_reference,
      });
    }

    return { ok: true, eventType, result: data };
  },

  async cancelSubscription() {
    return { ok: true };
  },
};

export async function simulateMockPayment(input: {
  internalReference: string;
  amount: number;
  currency: string;
  environment: "test" | "production";
  success: boolean;
}) {
  const payload = {
    type: input.success ? "payment.success" : "payment.failed",
    data: {
      internal_reference: input.internalReference,
      provider_transaction_id: `mock_${input.internalReference}`,
      amount: input.amount,
      currency: input.currency,
      status: input.success ? ("successful" as const) : ("failed" as const),
      environment: input.environment,
    },
  };

  const rawBody = JSON.stringify(payload);
  const { signWebhookPayload } = await import("@/lib/payments/signature");
  const signature = signWebhookPayload(rawBody);

  return mockPaymentProvider.handleWebhook(
    rawBody,
    new Headers({ "x-samagestion-signature": signature }),
  );
}
