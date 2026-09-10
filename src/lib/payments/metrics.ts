/**
 * Indicateurs prêts pour un futur /admin/payments — pas d'UI commerçant.
 */
export type RevenueSnapshot = {
  mrr: number;
  arr: number;
  paidSubscribers: number;
  freeSubscribers: number;
};

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
