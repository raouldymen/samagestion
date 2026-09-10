import { getPaymentProviderName } from "@/lib/payments/env";
import { mockPaymentProvider } from "@/lib/payments/providers/mock";
import { createUnconfiguredProvider } from "@/lib/payments/providers/unconfigured";
import type { PaymentProvider } from "@/lib/payments/types";

export function getPaymentProvider(): PaymentProvider {
  const name = getPaymentProviderName();

  switch (name) {
    case "mock":
    case "test":
    case "manual":
      return mockPaymentProvider;
    default:
      // Prestataire réel non encore branché — refuse plutôt que d'inventer une API.
      return createUnconfiguredProvider(name);
  }
}

export type { PaymentProvider };
