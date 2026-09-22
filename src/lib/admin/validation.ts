import { isPlanSlug } from "@/lib/subscriptions/constants";
import type { AdminPlanSlug } from "@/lib/payments/metrics";

export const ADMIN_TRIAL_DAYS = [7, 14, 30, 60] as const;
export const ADMIN_PLAN_PERIOD_DAYS = [30, 90, 365] as const;

export function parseAdminPlanSlug(value: string): AdminPlanSlug | null {
  return isPlanSlug(value) ? value : null;
}

export function parseAdminPeriodDays(value: string, plan: AdminPlanSlug) {
  if (plan === "free") {
    return 30;
  }

  const days = Number(value);
  if (!ADMIN_PLAN_PERIOD_DAYS.includes(days as (typeof ADMIN_PLAN_PERIOD_DAYS)[number])) {
    return null;
  }

  return days;
}

export function parseAdminTrialDays(value: string) {
  const days = Number(value);
  if (!ADMIN_TRIAL_DAYS.includes(days as (typeof ADMIN_TRIAL_DAYS)[number])) {
    return null;
  }

  return days;
}
