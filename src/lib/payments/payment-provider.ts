import { getPaymentProviderName } from "@/lib/payments/env";
import { mockPaymentProvider } from "@/lib/payments/providers/mock";
import { paydunyaPaymentProvider } from "@/lib/payments/providers/paydunya";
import { createUnconfiguredProvider } from "@/lib/payments/providers/unconfigured";
import type { PaymentProvider } from "@/lib/payments/types";

export function getPaymentProvider(): PaymentProvider {
  const name = getPaymentProviderName();

  switch (name) {
    case "mock":
    case "test":
    case "manual":
      return mockPaymentProvider;
    case "paydunya":
      return paydunyaPaymentProvider;
    default:
      return createUnconfiguredProvider(name);
  }
}

export type { PaymentProvider };
