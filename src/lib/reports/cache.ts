import type { ReportPeriod } from "@/types/reports";

/**
 * Clé de cache des rapports.
 * Aujourd'hui utilisée avec React `cache()` (durée = une requête).
 * Peut recevoir plus tard un store TTL en mémoire, sans Redis.
 */
export function reportsCacheKey(
  businessId: string,
  period: ReportPeriod,
  from?: string,
  to?: string,
) {
  return `reports:${businessId}:${period}:${from ?? ""}:${to ?? ""}`;
}
