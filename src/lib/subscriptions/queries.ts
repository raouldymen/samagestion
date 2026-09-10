import { cache } from "react";
import { requireBusinessSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type {
  PlanFeatureConfig,
  PlanSlug,
  SubscriptionBundle,
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionTransaction,
} from "@/types/subscriptions";
import { isPlanSlug } from "@/lib/subscriptions/constants";

const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: "fallback-free",
    name: "Gratuit",
    slug: "free",
    description: "Pour démarrer avec l'essentiel.",
    priceMonthly: 0,
    currency: "XOF",
    sortOrder: 1,
    features: {
      products: { enabled: true, limit: 100 },
      sales_monthly: { enabled: true, limit: 100 },
      customers: { enabled: true, limit: 100 },
      team_members: { enabled: true, limit: 1 },
      exports: { enabled: false, limit: null },
      financial_reports: { enabled: false, limit: null },
      team_management: { enabled: false, limit: null },
      audit_logs: { enabled: false, limit: null },
      priority_support: { enabled: false, limit: null },
    },
  },
  {
    id: "fallback-pro",
    name: "Pro",
    slug: "pro",
    description: "Pour les commerces en croissance.",
    priceMonthly: 5000,
    currency: "XOF",
    sortOrder: 2,
    features: {
      products: { enabled: true, limit: 1000 },
      sales_monthly: { enabled: true, limit: null },
      customers: { enabled: true, limit: null },
      team_members: { enabled: true, limit: 5 },
      exports: { enabled: true, limit: null },
      financial_reports: { enabled: true, limit: null },
      team_management: { enabled: true, limit: null },
      audit_logs: { enabled: false, limit: null },
      priority_support: { enabled: false, limit: null },
    },
  },
  {
    id: "fallback-business",
    name: "Business",
    slug: "business",
    description: "Pour les équipes et l'audit avancé.",
    priceMonthly: 10000,
    currency: "XOF",
    sortOrder: 3,
    features: {
      products: { enabled: true, limit: null },
      sales_monthly: { enabled: true, limit: null },
      customers: { enabled: true, limit: null },
      team_members: { enabled: true, limit: 20 },
      exports: { enabled: true, limit: null },
      financial_reports: { enabled: true, limit: null },
      team_management: { enabled: true, limit: null },
      audit_logs: { enabled: true, limit: null },
      priority_support: { enabled: true, limit: null },
    },
  },
];

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function asRecord(value: Json | undefined): Record<string, Json | undefined> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
}

function asFeatures(value: Json | undefined): Record<string, PlanFeatureConfig> {
  const row = asRecord(value);
  const features: Record<string, PlanFeatureConfig> = {};
  for (const [key, raw] of Object.entries(row)) {
    const item = asRecord(raw as Json);
    features[key] = {
      enabled: Boolean(item.enabled),
      limit: item.limit == null ? null : asNumber(item.limit),
    };
  }
  return features;
}

function asStatus(value: unknown): SubscriptionStatus {
  if (
    value === "trialing" ||
    value === "active" ||
    value === "past_due" ||
    value === "cancelled" ||
    value === "expired"
  ) {
    return value;
  }
  return "active";
}

function mapBundle(data: Json): SubscriptionBundle {
  const root = asRecord(data);
  const subscription = asRecord(root.subscription);
  const plan = asRecord(root.plan);
  const usage = asRecord(root.usage);
  const slug = String(plan.slug ?? "free");

  return {
    subscription: {
      id: String(subscription.id ?? ""),
      businessId: String(subscription.business_id ?? ""),
      planId: String(subscription.plan_id ?? ""),
      status: asStatus(subscription.status),
      startedAt: String(subscription.started_at ?? new Date().toISOString()),
      currentPeriodStart: String(subscription.current_period_start ?? new Date().toISOString()),
      currentPeriodEnd: subscription.current_period_end
        ? String(subscription.current_period_end)
        : null,
      trialStart: subscription.trial_start ? String(subscription.trial_start) : null,
      trialEnd: subscription.trial_end ? String(subscription.trial_end) : null,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      cancelledAt: subscription.cancelled_at ? String(subscription.cancelled_at) : null,
      daysRemaining:
        subscription.days_remaining == null ? null : asNumber(subscription.days_remaining),
      isTrial: Boolean(subscription.is_trial),
      isActive: Boolean(subscription.is_active),
    },
    plan: {
      id: String(plan.id ?? ""),
      name: String(plan.name ?? "Gratuit"),
      slug: isPlanSlug(slug) ? slug : "free",
      description: plan.description ? String(plan.description) : null,
      priceMonthly: asNumber(plan.price_monthly),
      currency: String(plan.currency ?? "XOF"),
    },
    features: asFeatures(root.features),
    usage: {
      products: asNumber(usage.products),
      salesMonthly: asNumber(usage.sales_monthly),
      customers: asNumber(usage.customers),
      teamMembers: asNumber(usage.team_members),
    },
  };
}

export const getSubscriptionBundle: () => Promise<SubscriptionBundle> = cache(async () => {
  await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_subscription_bundle");

  if (error || data == null) {
    return {
      subscription: {
        id: "",
        businessId: "",
        planId: "",
        status: "active",
        startedAt: new Date().toISOString(),
        currentPeriodStart: new Date().toISOString(),
        currentPeriodEnd: null,
        trialStart: null,
        trialEnd: null,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        daysRemaining: null,
        isTrial: false,
        isActive: true,
      },
      plan: {
        id: "",
        name: "Gratuit",
        slug: "free",
        description: null,
        priceMonthly: 0,
        currency: "XOF",
      },
      features: {
        products: { enabled: true, limit: 100 },
        sales_monthly: { enabled: true, limit: 100 },
        customers: { enabled: true, limit: 100 },
        team_members: { enabled: true, limit: 1 },
        exports: { enabled: false, limit: null },
        financial_reports: { enabled: false, limit: null },
        team_management: { enabled: false, limit: null },
        audit_logs: { enabled: false, limit: null },
        priority_support: { enabled: false, limit: null },
      },
      usage: { products: 0, salesMonthly: 0, customers: 0, teamMembers: 1 },
    };
  }

  return mapBundle(data as Json);
});

export async function getSubscriptionStatus() {
  const bundle = await getSubscriptionBundle();
  return {
    plan: bundle.plan,
    status: bundle.subscription.status,
    periodStart: bundle.subscription.currentPeriodStart,
    periodEnd: bundle.subscription.currentPeriodEnd,
    daysRemaining: bundle.subscription.daysRemaining,
    isTrial: bundle.subscription.isTrial,
    isActive: bundle.subscription.isActive,
    cancelAtPeriodEnd: bundle.subscription.cancelAtPeriodEnd,
  };
}

export async function listSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("list_subscription_plans");

    if (error || data == null) {
      return FALLBACK_PLANS;
    }

    const list = Array.isArray(data) ? data : [];
    if (list.length === 0) {
      return FALLBACK_PLANS;
    }

    return list.map((item) => {
      const row = asRecord(item as Json);
      const slug = String(row.slug ?? "free");
      return {
        id: String(row.id ?? ""),
        name: String(row.name ?? ""),
        slug: isPlanSlug(slug) ? slug : "free",
        description: row.description ? String(row.description) : null,
        priceMonthly: asNumber(row.price_monthly),
        currency: String(row.currency ?? "XOF"),
        sortOrder: asNumber(row.sort_order),
        features: asFeatures(row.features),
      };
    });
  } catch {
    return FALLBACK_PLANS;
  }
}

export async function listBillingTransactions(): Promise<SubscriptionTransaction[]> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subscription_transactions")
    .select(
      "id, business_id, subscription_id, provider, provider_transaction_id, internal_reference, amount, currency, status, created_at, metadata",
    )
    .eq("business_id", session.businessId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const meta = asRecord(row.metadata as Json);
    return {
      id: row.id,
      businessId: row.business_id,
      subscriptionId: row.subscription_id,
      provider: row.provider,
      providerTransactionId: row.provider_transaction_id,
      internalReference: row.internal_reference ?? null,
      planName: meta.plan_name ? String(meta.plan_name) : null,
      amount: asNumber(row.amount),
      currency: row.currency,
      status: row.status === "paid" ? "successful" : row.status,
      createdAt: row.created_at,
    };
  });
}

export type { PlanSlug };
