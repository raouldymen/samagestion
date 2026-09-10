import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { getPaymentEnv } from "@/lib/payments/env";
import { paymentLog } from "@/lib/payments/logger";
import { emitPaymentLifecycleEvent } from "@/lib/payments/events";
import {
  isMobileMoneyMethod,
  normalizeSenegalPhone,
} from "@/lib/payments/mobile-money";
import { getPaymentTransaction } from "@/lib/payments/payment-service";
import { createServiceClient, isServiceRoleConfigured } from "@/lib/payments/service-client";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIpFromHeaders,
} from "@/lib/security/rate-limit";
import type { Json } from "@/types/database";

export const dynamic = "force-dynamic";

/**
 * Simulation mock (test uniquement).
 * confirm_mock_test_payment est réservé au service_role.
 * Le client ne peut pas activer un abonnement sans passer par ce contrôle serveur.
 */
export async function POST(request: Request) {
  try {
    const ip = clientIpFromHeaders(request.headers);
    const limited = checkRateLimit({
      key: `mockSimulate:${ip}`,
      windowMs: RATE_LIMITS.mockSimulate.windowMs,
      max: RATE_LIMITS.mockSimulate.max,
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

    if (getPaymentEnv() === "production") {
      return NextResponse.json({ error: "MOCK_DISABLED_IN_PRODUCTION" }, { status: 403 });
    }

    if (!isServiceRoleConfigured()) {
      return NextResponse.json({ error: "SERVICE_ROLE_NOT_CONFIGURED" }, { status: 503 });
    }

    const body = (await request.json()) as {
      reference?: string;
      success?: boolean;
      method?: string;
      phone?: string;
    };

    const reference = body.reference?.trim() ?? "";
    if (!reference) {
      return NextResponse.json({ error: "REFERENCE_REQUIRED" }, { status: 400 });
    }

    const methodRaw = body.method?.trim() ?? "";
    const phoneRaw = body.phone?.trim() ?? "";
    let mobileMethod: string | null = null;
    let mobilePhone: string | null = null;

    if (methodRaw || phoneRaw) {
      if (!isMobileMoneyMethod(methodRaw)) {
        return NextResponse.json({ error: "INVALID_METHOD" }, { status: 400 });
      }
      const normalizedPhone = normalizeSenegalPhone(phoneRaw);
      if (!normalizedPhone) {
        return NextResponse.json({ error: "INVALID_PHONE" }, { status: 400 });
      }
      mobileMethod = methodRaw;
      mobilePhone = normalizedPhone;
    }

    const tx = await getPaymentTransaction(reference);
    if (!tx) {
      return NextResponse.json({ error: "TRANSACTION_NOT_FOUND" }, { status: 404 });
    }

    if (tx.business.id !== session.business.id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const success = body.success !== false;
    const admin = createServiceClient();
    await admin.rpc("set_mock_payments_enabled", { p_enabled: true });

    // Répare les checkouts créés avant activation du flag mock (environment=production à tort)
    if (tx.environment !== "test") {
      if (tx.provider === "mock" || tx.provider === "pending") {
        const { error: healError } = await admin
          .from("subscription_transactions")
          .update({ environment: "test" })
          .eq("internal_reference", tx.internalReference)
          .eq("business_id", session.business.id)
          .in("status", ["pending", "failed"]);
        if (healError) {
          return NextResponse.json({ error: "MOCK_ONLY_IN_TEST" }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: "MOCK_ONLY_IN_TEST" }, { status: 403 });
      }
    }

    if (mobileMethod && mobilePhone) {
      const { data: existing } = await admin
        .from("subscription_transactions")
        .select("metadata")
        .eq("internal_reference", tx.internalReference)
        .eq("business_id", session.business.id)
        .maybeSingle();

      const prev =
        existing?.metadata &&
        typeof existing.metadata === "object" &&
        !Array.isArray(existing.metadata)
          ? (existing.metadata as Record<string, Json | undefined>)
          : {};

      await admin
        .from("subscription_transactions")
        .update({
          metadata: {
            ...prev,
            mobile_method: mobileMethod,
            mobile_phone: mobilePhone,
            channel: "mobile_money",
          },
        })
        .eq("internal_reference", tx.internalReference)
        .eq("business_id", session.business.id)
        .in("status", ["pending", "failed"]);
    }

    const { data, error } = await admin.rpc("confirm_mock_test_payment", {
      p_internal_reference: tx.internalReference,
      p_success: success,
    });

    if (error) {
      paymentLog("webhook_rejected", { reason: error.message, provider: "mock" });
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }

    if (success) {
      paymentLog("subscription_activated", { reference: tx.internalReference });
      emitPaymentLifecycleEvent("subscription.payment_success", {
        reference: tx.internalReference,
      });
    } else {
      paymentLog("payment_failed", { reference: tx.internalReference });
      emitPaymentLifecycleEvent("subscription.payment_failed", {
        reference: tx.internalReference,
      });
    }

    return NextResponse.json({ ok: true, result: data });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "SIMULATE_FAILED";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
