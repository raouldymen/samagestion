import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments/payment-provider";
import { paymentLog } from "@/lib/payments/logger";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIpFromHeaders,
} from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Webhook paiements — signature obligatoire.
 * Ne jamais activer un abonnement sans vérification serveur.
 */
export async function POST(request: Request) {
  const ip = clientIpFromHeaders(request.headers);
  const limited = checkRateLimit({
    key: `webhook:${ip}`,
    windowMs: RATE_LIMITS.webhook.windowMs,
    max: RATE_LIMITS.webhook.max,
  });
  if (!limited.allowed) {
    paymentLog("webhook_rejected", { error: "RATE_LIMITED" });
    return NextResponse.json(
      { ok: false, error: "RATE_LIMITED" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const rawBody = await request.text();
  paymentLog("webhook_received", { bytes: rawBody.length });

  try {
    const provider = getPaymentProvider();
    const result = await provider.handleWebhook(rawBody, request.headers);

    if (!result.ok) {
      paymentLog("webhook_rejected", { error: result.error ?? "unknown" });
      return NextResponse.json(
        { ok: false, error: result.error ?? "WEBHOOK_REJECTED" },
        { status: result.error === "INVALID_SIGNATURE" ? 401 : 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      event: result.eventType,
      result: result.result,
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "WEBHOOK_ERROR";
    paymentLog("webhook_rejected", { error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
