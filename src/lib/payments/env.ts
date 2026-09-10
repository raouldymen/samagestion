import type { PaymentEnvironment } from "@/lib/payments/types";

export function getPaymentEnv(): PaymentEnvironment {
  return process.env.PAYMENT_ENV === "production" ? "production" : "test";
}

export function getPaymentProviderName() {
  return (process.env.PAYMENT_PROVIDER ?? "mock").toLowerCase().trim() || "mock";
}

export function getPaymentWebhookSecret() {
  return process.env.PAYMENT_WEBHOOK_SECRET ?? "";
}

export function getPaymentSecretKey() {
  return process.env.PAYMENT_SECRET_KEY ?? "";
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export function getGracePeriodDays() {
  const raw = Number(process.env.GRACE_PERIOD_DAYS ?? "3");
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : 3;
}

/** Ne jamais exposer ces clés au client. */
export const SERVER_ONLY_PAYMENT_KEYS = [
  "PAYMENT_SECRET_KEY",
  "PAYMENT_WEBHOOK_SECRET",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;
