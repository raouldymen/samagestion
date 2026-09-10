import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { startCheckout } from "@/lib/payments/payment-service";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIpFromHeaders,
} from "@/lib/security/rate-limit";
import { mapSubscriptionError } from "@/lib/subscriptions/errors";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/checkout
 * Body: { planId } — jamais amount / currency / business_id
 */
export async function POST(request: Request) {
  try {
    const ip = clientIpFromHeaders(request.headers);
    const limited = checkRateLimit({
      key: `checkout:${ip}`,
      windowMs: RATE_LIMITS.checkout.windowMs,
      max: RATE_LIMITS.checkout.max,
    });
    if (!limited.allowed) {
      return NextResponse.json(
        { error: "RATE_LIMITED", retryAfterSec: limited.retryAfterSec },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }

    const session = await requireBusinessSession();
    if (!hasPermission(session.role, "settings.edit")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
    }

    const planId =
      body && typeof body === "object" && "planId" in body && typeof body.planId === "string"
        ? body.planId.trim()
        : "";

    if (!planId) {
      return NextResponse.json({ error: "PLAN_REQUIRED" }, { status: 400 });
    }

    const checkout = await startCheckout(planId);

    return NextResponse.json({
      checkoutUrl: checkout.checkoutUrl,
      reference: checkout.reference,
      amount: checkout.amount,
      currency: checkout.currency,
    });
  } catch (caught) {
    const message =
      caught instanceof Error && caught.message === "NEXT_REDIRECT"
        ? "UNAUTHORIZED"
        : mapSubscriptionError(caught);

    const code =
      caught instanceof Error && /PAYMENT_REQUIRED|PLAN_NOT_PAYABLE|PLAN_NOT_FOUND|FORBIDDEN/i.test(
        caught.message,
      )
        ? caught.message.split(":")[0]
        : "CHECKOUT_FAILED";

    return NextResponse.json(
      { error: code, message },
      { status: code === "FORBIDDEN" ? 403 : 400 },
    );
  }
}
