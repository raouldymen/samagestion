import type { BusinessRole } from "@/types/database";

export const RESTRICTED_SETTINGS = [
  "business",
  "subscription",
  "usage",
  "billing",
  "receipts",
] as const;

export type SettingsSection = (typeof RESTRICTED_SETTINGS)[number];

export function canAccessSettingsSection(role: BusinessRole, section: SettingsSection) {
  const isRestrictedRole = role === "cashier" || role === "stock_manager";
  return !isRestrictedRole || !RESTRICTED_SETTINGS.includes(section);
}
