import { createHmac, timingSafeEqual } from "node:crypto";
import { getPaymentWebhookSecret } from "@/lib/payments/env";

/**
 * Signature HMAC-SHA256 des webhooks paiements.
 * Fail-closed : sans PAYMENT_WEBHOOK_SECRET, toute vérification échoue.
 */
export function signWebhookPayload(rawBody: string, secret = getPaymentWebhookSecret()) {
  if (!secret) {
    throw new Error("PAYMENT_WEBHOOK_SECRET_MISSING");
  }
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyWebhookSignature(rawBody: string, signatureHeader: string | null) {
  const secret = getPaymentWebhookSecret();
  if (!secret || !signatureHeader) {
    return false;
  }

  let expected: string;
  try {
    expected = signWebhookPayload(rawBody, secret);
  } catch {
    return false;
  }

  const provided = signatureHeader.replace(/^sha256=/i, "").trim();

  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    if (a.length !== b.length) {
      return false;
    }
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
