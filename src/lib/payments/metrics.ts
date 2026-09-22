/**
 * Indicateurs prêts pour un futur /admin/payments — pas d'UI commerçant.
 */
export type AdminPlanSlug = "free" | "pro" | "business";

export type AdminSubscriptionRow = {
  businessId: string;
  businessName: string;
  businessEmail: string | null;
  plan: AdminPlanSlug;
  planName: string;
  status: string;
  periodEnd: string | null;
  trialEnd: string | null;
};

export type AdminPaymentRow = {
  id: string;
  businessId: string;
  businessName: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
  planName: string | null;
};

export type RevenueSnapshot = {
  mrr: number;
  arr: number;
  paidSubscribers: number;
  freeSubscribers: number;
  proSubscribers: number;
  businessSubscribers: number;
  subscriptions: AdminSubscriptionRow[];
};

export function emptyRevenueSnapshot(): RevenueSnapshot {
  return {
    mrr: 0,
    arr: 0,
    paidSubscribers: 0,
    freeSubscribers: 0,
    proSubscribers: 0,
    businessSubscribers: 0,
    subscriptions: [],
  };
}

export function computeConversionRate(free: number, paid: number) {
  const total = free + paid;
  if (total <= 0) {
    return 0;
  }
  return paid / total;
}

export function computeChurnRate(churned: number, startPaid: number) {
  if (startPaid <= 0) {
    return 0;
  }
  return churned / startPaid;
}
