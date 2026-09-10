import { NextResponse } from "next/server";
import { hasPermission } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { getPaymentTransaction } from "@/lib/payments/payment-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await requireBusinessSession();
    if (!hasPermission(session.role, "settings.view")) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const url = new URL(request.url);
    const ref = url.searchParams.get("ref")?.trim() ?? "";
    if (!ref) {
      return NextResponse.json({ error: "REFERENCE_REQUIRED" }, { status: 400 });
    }

    const tx = await getPaymentTransaction(ref);
    if (!tx) {
      return NextResponse.json({ error: "TRANSACTION_NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      reference: tx.internalReference,
      status: tx.status,
      amount: tx.amount,
      currency: tx.currency,
      plan: tx.plan,
      business: tx.business,
      confirmedAt: tx.confirmedAt,
    });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}
