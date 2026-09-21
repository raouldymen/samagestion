"use client";

import { useBusinessSession } from "@/components/providers/business-provider";

export function useBusiness() {
  const session = useBusinessSession();

  return {
    business: session.business,
    businessId: session.businessId,
    role: session.role,
    hasActiveCashier: session.hasActiveCashier ?? false,
  };
}
