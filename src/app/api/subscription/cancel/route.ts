import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { paymentLog } from "@/lib/payments/logger";
import { emitPaymentLifecycleEvent } from "@/lib/payments/events";
import { createClient } from "@/lib/supabase/server";
import { mapSubscriptionError } from "@/lib/subscriptions/errors";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await requireBusinessSession();
    if (!hasPermission(session.role, "settings.edit")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("cancel_business_subscription");
    if (error) {
      return NextResponse.json(
        { error: "CANCEL_FAILED", message: mapSubscriptionError(error) },
        { status: 400 },
      );
    }

    paymentLog("subscription_cancelled", { businessId: session.businessId });
    emitPaymentLifecycleEvent("subscription.cancelled", {
      businessId: session.businessId,
    });

    return NextResponse.json({
      ok: true,
      cancelAtPeriodEnd: true,
      message: "Abonnement annulé à la fin de la période en cours.",
    });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}
