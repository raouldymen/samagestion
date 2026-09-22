import { requirePlatformAdmin } from "@/lib/admin/access";
import { createServiceClient } from "@/lib/payments/service-client";
import type { AdminPaymentRow, AdminPlanSlug, AdminSubscriptionRow } from "@/lib/payments/metrics";
import type { Json } from "@/types/database";

const CURRENT_STATUSES = new Set(["trialing", "active", "past_due", "cancelled"]);

function asPlan(value: unknown): AdminPlanSlug {
  return value === "pro" || value === "business" ? value : "free";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value ?? 0) || 0;
}

function planNameFromMeta(metadata: Json | undefined) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const planName = metadata.plan_name;
  return typeof planName === "string" && planName ? planName : null;
}

export async function listAdminBusinesses(): Promise<AdminSubscriptionRow[]> {
  await requirePlatformAdmin();
  const service = createServiceClient();
  const [{ data: businesses }, { data: subscriptions }, { data: plans }] = await Promise.all([
    service.from("businesses").select("id, name, email").order("name"),
    service
      .from("business_subscriptions")
      .select("business_id, plan_id, status, current_period_end, trial_end, created_at")
      .order("created_at", { ascending: false }),
    service.from("subscription_plans").select("id, slug, name"),
  ]);

  const planById = new Map((plans ?? []).map((plan) => [plan.id, plan]));
  const subscriptionRows = subscriptions ?? [];
  const currentByBusiness = new Map<string, (typeof subscriptionRows)[number]>();

  for (const row of subscriptionRows) {
    if (currentByBusiness.has(row.business_id)) {
      continue;
    }

    if (CURRENT_STATUSES.has(row.status)) {
      currentByBusiness.set(row.business_id, row);
    }
  }

  for (const row of subscriptionRows) {
    if (!currentByBusiness.has(row.business_id)) {
      currentByBusiness.set(row.business_id, row);
    }
  }

  return (businesses ?? []).map((business) => {
    const subscription = currentByBusiness.get(business.id);
    const plan = subscription ? planById.get(subscription.plan_id) : undefined;
    return {
      businessId: business.id,
      businessName: business.name,
      businessEmail: business.email,
      plan: asPlan(plan?.slug),
      planName: plan?.name ?? "Gratuit",
      status: subscription?.status ?? "expired",
      periodEnd: subscription?.current_period_end ?? null,
      trialEnd: subscription?.trial_end ?? null,
    };
  });
}

export async function listAdminPayments(): Promise<AdminPaymentRow[]> {
  await requirePlatformAdmin();
  const service = createServiceClient();
  const [{ data: transactions }, { data: businesses }] = await Promise.all([
    service
      .from("subscription_transactions")
      .select("id, business_id, amount, currency, status, provider, created_at, metadata")
      .order("created_at", { ascending: false })
      .limit(50),
    service.from("businesses").select("id, name"),
  ]);

  const nameById = new Map((businesses ?? []).map((business) => [business.id, business.name]));

  return (transactions ?? []).map((row) => ({
    id: row.id,
    businessId: row.business_id,
    businessName: nameById.get(row.business_id) ?? "Commerce",
    amount: asNumber(row.amount),
    currency: row.currency,
    status: row.status,
    provider: row.provider,
    createdAt: row.created_at,
    planName: planNameFromMeta(row.metadata as Json),
  }));
}
