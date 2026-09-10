import { createServiceClient } from "@/lib/payments/service-client";
import type { RevenueSnapshot } from "@/lib/payments/metrics";
import type { Json } from "@/types/database";

function asNumber(value: Json | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export async function getPlatformRevenueSnapshot(): Promise<RevenueSnapshot> {
  try {
    const service = createServiceClient();
    const { data, error } = await service.rpc("subscription_revenue_snapshot");

    if (error || !data || typeof data !== "object" || Array.isArray(data)) {
      return { mrr: 0, arr: 0, paidSubscribers: 0, freeSubscribers: 0 };
    }

    const snapshot = data as Record<string, Json | undefined>;
    return {
      mrr: asNumber(snapshot.mrr),
      arr: asNumber(snapshot.arr),
      paidSubscribers: asNumber(snapshot.paid_subscribers),
      freeSubscribers: asNumber(snapshot.free_subscribers),
    };
  } catch {
    return { mrr: 0, arr: 0, paidSubscribers: 0, freeSubscribers: 0 };
  }
}
