import { getPaymentEnv, getPaymentProviderName, getSiteUrl } from "@/lib/payments/env";
import { paymentLog } from "@/lib/payments/logger";
import { getPaymentProvider } from "@/lib/payments/payment-provider";
import { createServiceClient, isServiceRoleConfigured } from "@/lib/payments/service-client";
import type {
  PaymentTransactionStatus,
  PaymentTransactionView,
  PendingCheckout,
} from "@/lib/payments/types";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

function asRecord(value: Json | undefined): Record<string, Json | undefined> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
}

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/**
 * En mode test + provider mock, active le flag DB avant checkout
 * pour que create_payment_checkout crée bien environment='test'.
 */
async function ensureMockCheckoutEnvironment() {
  if (getPaymentEnv() !== "test") {
    return;
  }
  const provider = getPaymentProviderName();
  if (
    provider !== "mock" &&
    provider !== "test" &&
    provider !== "manual" &&
    provider !== "paydunya"
  ) {
    return;
  }
  if (!isServiceRoleConfigured()) {
    throw new Error("SERVICE_ROLE_NOT_CONFIGURED");
  }
  const admin = createServiceClient();
  const { error } = await admin.rpc("set_mock_payments_enabled", { p_enabled: true });
  if (error) {
    throw new Error(error.message);
  }
}

export async function startCheckout(planId: string): Promise<{
  checkoutUrl: string;
  reference: string;
  amount: number;
  currency: string;
}> {
  // Ne jamais accepter amount / currency / business_id depuis le client.
  await ensureMockCheckoutEnvironment();

  const supabase = await createClient();
  const environment = getPaymentEnv();

  const { data, error } = await supabase.rpc("create_payment_checkout", {
    p_plan_id: planId,
    p_environment: environment,
  });

  if (error || data == null) {
    throw new Error(error?.message ?? "CHECKOUT_FAILED");
  }

  const row = asRecord(data as Json);
  const dbEnv = row.environment === "production" ? "production" : "test";
  const pending: PendingCheckout = {
    transactionId: String(row.transaction_id ?? ""),
    internalReference: String(row.internal_reference ?? ""),
    amount: asNumber(row.amount),
    currency: String(row.currency ?? "XOF"),
    planId: String(row.plan_id ?? ""),
    planSlug: String(row.plan_slug ?? ""),
    planName: String(row.plan_name ?? ""),
    businessId: String(row.business_id ?? ""),
    environment: dbEnv,
    status: "pending",
  };

  const provider = getPaymentProvider();
  const site = getSiteUrl();
  const session = await provider.createCheckout({
    businessId: pending.businessId,
    planId: pending.planId,
    planSlug: pending.planSlug,
    planName: pending.planName,
    amount: pending.amount,
    currency: pending.currency,
    internalReference: pending.internalReference,
    successUrl: `${site}/payment/success?ref=${encodeURIComponent(pending.internalReference)}`,
    cancelUrl: `${site}/payment/failed?ref=${encodeURIComponent(pending.internalReference)}`,
    environment: pending.environment,
  });

  await supabase.rpc("attach_payment_provider", {
    p_internal_reference: pending.internalReference,
    p_provider: session.provider,
    p_provider_transaction_id: session.providerTransactionId,
    p_metadata: {
      checkout_url: session.checkoutUrl,
    },
  });

  paymentLog("checkout_created", {
    provider: session.provider,
    reference: pending.internalReference,
    amount: pending.amount,
    plan: pending.planSlug,
  });

  return {
    checkoutUrl: session.checkoutUrl,
    reference: pending.internalReference,
    amount: pending.amount,
    currency: pending.currency,
  };
}

export async function getPaymentTransaction(
  reference: string,
): Promise<PaymentTransactionView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_payment_transaction", {
    p_internal_reference: reference,
  });

  if (error || data == null) {
    return null;
  }

  const root = asRecord(data as Json);
  const plan = asRecord(root.plan);
  const business = asRecord(root.business);

  return {
    id: String(root.id ?? ""),
    internalReference: String(root.internal_reference ?? ""),
    provider: String(root.provider ?? ""),
    providerTransactionId: root.provider_transaction_id
      ? String(root.provider_transaction_id)
      : null,
    amount: asNumber(root.amount),
    currency: String(root.currency ?? "XOF"),
    status: String(root.status ?? "pending") as PaymentTransactionStatus,
    environment: root.environment === "production" ? "production" : "test",
    createdAt: String(root.created_at ?? ""),
    confirmedAt: root.confirmed_at ? String(root.confirmed_at) : null,
    failureReason: root.failure_reason ? String(root.failure_reason) : null,
    plan: {
      id: String(plan.id ?? ""),
      name: String(plan.name ?? ""),
      slug: String(plan.slug ?? ""),
      priceMonthly: asNumber(plan.price_monthly),
    },
    business: {
      id: String(business.id ?? ""),
      name: String(business.name ?? ""),
    },
  };
}

export function addSubscriptionMonth(from: Date): Date {
  const next = new Date(from.getTime());
  next.setMonth(next.getMonth() + 1);
  return next;
}

export function statusLabel(status: PaymentTransactionStatus) {
  switch (status) {
    case "successful":
      return "Payé";
    case "pending":
      return "En attente";
    case "failed":
      return "Échoué";
    case "cancelled":
      return "Annulé";
    case "refunded":
      return "Remboursé";
    case "expired":
      return "Expiré";
    default:
      return status;
  }
}
