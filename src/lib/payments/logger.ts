type LogEvent =
  | "checkout_created"
  | "payment_verified"
  | "payment_failed"
  | "webhook_received"
  | "webhook_rejected"
  | "subscription_activated"
  | "subscription_renewed"
  | "subscription_cancelled";

export function paymentLog(
  event: LogEvent,
  details: Record<string, string | number | boolean | null | undefined> = {},
) {
  const safe = { ...details };
  delete safe.secret;
  delete safe.signature;
  delete safe.webhookSecret;
  console.info(`[payments] ${event}`, safe);
}
