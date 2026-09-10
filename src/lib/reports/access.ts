import { redirect } from "next/navigation";
import { canViewFinancialReports } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { getSubscriptionBundle } from "@/lib/subscriptions/queries";
import { hasFeature } from "@/lib/subscriptions/limits";
import type { CurrentSession } from "@/types";

export async function requireReportsSession(): Promise<CurrentSession> {
  const session = await requireBusinessSession();
  const bundle = await getSubscriptionBundle();

  if (!canViewFinancialReports(session.role) || !hasFeature(bundle.features, "financial_reports")) {
    throw new Error("FEATURE_NOT_AVAILABLE:financial_reports");
  }

  return session;
}

export async function requireReportsPage() {
  const session = await requireBusinessSession();

  if (!canViewFinancialReports(session.role)) {
    redirect("/dashboard");
  }

  const bundle = await getSubscriptionBundle();
  if (!hasFeature(bundle.features, "financial_reports")) {
    redirect("/upgrade?feature=financial_reports");
  }

  return session;
}
