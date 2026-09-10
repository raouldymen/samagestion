import type { PlanFeatureKey, PlanSlug } from "@/types/subscriptions";

export const TRIAL_DAYS = 14;

export const PLAN_FEATURE_KEYS: PlanFeatureKey[] = [
  "products",
  "sales_monthly",
  "customers",
  "team_members",
  "exports",
  "financial_reports",
  "team_management",
  "audit_logs",
  "priority_support",
];

export const PLAN_SLUGS: PlanSlug[] = ["free", "pro", "business"];

export const FEATURE_LABELS: Record<PlanFeatureKey, string> = {
  products: "Produits",
  sales_monthly: "Ventes ce mois",
  customers: "Clients",
  team_members: "Membres",
  exports: "Exports",
  financial_reports: "Rapports financiers",
  team_management: "Gestion d'équipe",
  audit_logs: "Journal d'audit",
  priority_support: "Support prioritaire",
};

export const COMPARISON_ROWS: {
  label: string;
  key: PlanFeatureKey | "stock" | "receipts" | "notifications" | "basic_reports";
  free: string;
  pro: string;
  business: string;
}[] = [
  { label: "Stock", key: "stock", free: "✓", pro: "✓", business: "✓" },
  { label: "Reçus", key: "receipts", free: "✓", pro: "✓", business: "✓" },
  { label: "Notifications", key: "notifications", free: "✓", pro: "✓", business: "✓" },
  { label: "Rapports de base", key: "basic_reports", free: "✓", pro: "✓", business: "✓" },
  { label: "Produits", key: "products", free: "100", pro: "1 000", business: "Illimité" },
  { label: "Ventes / mois", key: "sales_monthly", free: "100", pro: "Illimité", business: "Illimité" },
  { label: "Clients", key: "customers", free: "100", pro: "Illimité", business: "Illimité" },
  { label: "Membres", key: "team_members", free: "1", pro: "5", business: "20" },
  { label: "Rapports avancés", key: "financial_reports", free: "–", pro: "✓", business: "✓" },
  { label: "Exports", key: "exports", free: "–", pro: "✓", business: "✓" },
  { label: "Équipe", key: "team_management", free: "–", pro: "✓", business: "✓" },
  { label: "Audit avancé", key: "audit_logs", free: "–", pro: "–", business: "✓" },
  { label: "Support prioritaire", key: "priority_support", free: "–", pro: "–", business: "✓" },
];

export function isPlanSlug(value: string): value is PlanSlug {
  return PLAN_SLUGS.includes(value as PlanSlug);
}

export function isPlanFeatureKey(value: string): value is PlanFeatureKey {
  return PLAN_FEATURE_KEYS.includes(value as PlanFeatureKey);
}
