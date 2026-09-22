import { createServiceClient } from "@/lib/payments/service-client";
import {
  emptyRevenueSnapshot,
  type AdminPlanSlug,
  type AdminSubscriptionRow,
  type RevenueSnapshot,
} from "@/lib/payments/metrics";
import type { Json } from "@/types/database";

function asNumber(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asPlan(value: unknown): AdminPlanSlug {
  return value === "pro" || value === "business" ? value : "free";
}

function asSubscriptions(value: Json | undefined): AdminSubscriptionRow[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, Json | undefined>;
    const businessId = String(row.businessId ?? "");
    if (!businessId) return [];

    return [{
      businessId,
      businessName: String(row.businessName ?? "Commerce"),
      businessEmail: row.businessEmail ? String(row.businessEmail) : null,
      plan: asPlan(row.plan),
      planName: String(row.planName ?? "Gratuit"),
      status: String(row.status ?? "active"),
      periodEnd: row.periodEnd ? String(row.periodEnd) : null,
      trialEnd: row.trialEnd ? String(row.trialEnd) : null,
    }];
  });
}

export async function getPlatformRevenueSnapshot(): Promise<RevenueSnapshot> {
  try {
    const service = createServiceClient();
    const { data, error } = await service.rpc("subscription_revenue_snapshot");

    if (error || !data || typeof data !== "object" || Array.isArray(data)) {
      return emptyRevenueSnapshot();
    }

    const snapshot = data as Record<string, Json | undefined>;
    return {
      mrr: asNumber(snapshot.mrr),
      arr: asNumber(snapshot.arr),
      paidSubscribers: asNumber(snapshot.paid_subscribers),
      freeSubscribers: asNumber(snapshot.free_subscribers),
      proSubscribers: asNumber(snapshot.pro_subscribers),
      businessSubscribers: asNumber(snapshot.business_subscribers),
      subscriptions: asSubscriptions(snapshot.subscriptions),
    };
  } catch {
    return emptyRevenueSnapshot();
  }
}
