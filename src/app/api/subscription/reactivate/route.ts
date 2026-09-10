import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
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
    const { error } = await supabase.rpc("reactivate_business_subscription");
    if (error) {
      return NextResponse.json(
        { error: "REACTIVATE_FAILED", message: mapSubscriptionError(error) },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      cancelAtPeriodEnd: false,
      message: "Abonnement réactivé.",
    });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}
