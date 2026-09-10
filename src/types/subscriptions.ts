export type PlanSlug = "free" | "pro" | "business";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "cancelled"
  | "expired";

export type PlanFeatureKey =
  | "products"
  | "sales_monthly"
  | "customers"
  | "team_members"
  | "exports"
  | "financial_reports"
  | "team_management"
  | "audit_logs"
  | "priority_support";

export type PlanFeatureConfig = {
  enabled: boolean;
  limit: number | null;
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  slug: PlanSlug;
  description: string | null;
  priceMonthly: number;
  currency: string;
  sortOrder: number;
  features: Record<string, PlanFeatureConfig>;
};

export type BusinessSubscription = {
  id: string;
  businessId: string;
  planId: string;
  status: SubscriptionStatus;
  startedAt: string;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  trialStart: string | null;
  trialEnd: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  daysRemaining: number | null;
  isTrial: boolean;
  isActive: boolean;
};

export type SubscriptionUsage = {
  products: number;
  salesMonthly: number;
  customers: number;
  teamMembers: number;
};

export type SubscriptionBundle = {
  subscription: BusinessSubscription;
  plan: Omit<SubscriptionPlan, "sortOrder" | "features"> & {
    features?: Record<string, PlanFeatureConfig>;
  };
  features: Record<string, PlanFeatureConfig>;
  usage: SubscriptionUsage;
};

export type UsageMeter = {
  key: PlanFeatureKey;
  label: string;
  used: number;
  limit: number | null;
  unlimited: boolean;
  ratio: number | null;
  warning: boolean;
  blocked: boolean;
};

export type SubscriptionTransaction = {
  id: string;
  businessId: string;
  subscriptionId: string | null;
  provider: string;
  providerTransactionId: string | null;
  internalReference: string | null;
  planName: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
};
