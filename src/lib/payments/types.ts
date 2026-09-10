export type PaymentEnvironment = "test" | "production";

export type PaymentTransactionStatus =
  | "pending"
  | "successful"
  | "failed"
  | "cancelled"
  | "refunded"
  | "expired";

export type PaymentEventType =
  | "payment.success"
  | "payment.failed"
  | "subscription.created"
  | "subscription.renewed"
  | "subscription.cancelled"
  | "subscription.expired"
  | "subscription.payment_success"
  | "subscription.payment_failed"
  | "subscription.expiring";

export type CheckoutSessionInput = {
  businessId: string;
  planId: string;
  planSlug: string;
  planName: string;
  amount: number;
  currency: string;
  internalReference: string;
  successUrl: string;
  cancelUrl: string;
  environment: PaymentEnvironment;
};

export type CheckoutSessionResult = {
  provider: string;
  checkoutUrl: string;
  providerTransactionId: string;
  ready: true;
};

export type VerifyPaymentInput = {
  provider: string;
  providerTransactionId: string;
  internalReference?: string;
};

export type VerifyPaymentResult = {
  ok: boolean;
  status: PaymentTransactionStatus | "unknown";
  amount?: number;
  currency?: string;
  internalReference?: string;
};

export type WebhookHandleResult = {
  ok: boolean;
  ignored?: boolean;
  error?: string;
  eventType?: string;
  result?: unknown;
};

export type PaymentProvider = {
  readonly name: string;
  createCheckout(input: CheckoutSessionInput): Promise<CheckoutSessionResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  handleWebhook(rawBody: string, headers: Headers): Promise<WebhookHandleResult>;
  cancelSubscription(subscriptionId: string): Promise<{ ok: boolean }>;
};

export type PendingCheckout = {
  transactionId: string;
  internalReference: string;
  amount: number;
  currency: string;
  planId: string;
  planSlug: string;
  planName: string;
  businessId: string;
  environment: PaymentEnvironment;
  status: PaymentTransactionStatus;
};

export type PaymentTransactionView = {
  id: string;
  internalReference: string;
  provider: string;
  providerTransactionId: string | null;
  amount: number;
  currency: string;
  status: PaymentTransactionStatus;
  environment: PaymentEnvironment;
  createdAt: string;
  confirmedAt: string | null;
  failureReason: string | null;
  plan: {
    id: string;
    name: string;
    slug: string;
    priceMonthly: number;
  };
  business: {
    id: string;
    name: string;
  };
};
