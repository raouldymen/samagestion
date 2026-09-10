import type { PaymentEventType } from "@/lib/payments/types";
import { paymentLog } from "@/lib/payments/logger";

/**
 * Événements email préparés — envoi réel plus tard (Resend / autre).
 */
export function emitPaymentLifecycleEvent(
  type: PaymentEventType,
  payload: Record<string, string | number | null | undefined>,
) {
  paymentLog(
    type === "subscription.renewed"
      ? "subscription_renewed"
      : type === "subscription.cancelled"
        ? "subscription_cancelled"
        : type.includes("failed")
          ? "payment_failed"
          : "subscription_activated",
    { emailEvent: type, ...payload },
  );
}
