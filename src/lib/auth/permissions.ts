import type { BusinessRole } from "@/types/database";

export const PERMISSION_LIST = [
  "dashboard.view",
  "sales.view",
  "sales.create",
  "sales.edit",
  "sales.cancel",
  "sales.list_all",
  "sales.cancel_own",
  "customers.view",
  "customers.create",
  "customers.edit",
  "customers.delete",
  "products.view",
  "products.create",
  "products.edit",
  "products.delete",
  "products.manage",
  "stock.view",
  "stock.adjust",
  "purchases.view",
  "purchases.create",
  "purchases.edit",
  "purchases.cancel",
  "purchases.manage",
  "suppliers.view",
  "suppliers.create",
  "suppliers.edit",
  "expenses.view",
  "expenses.create",
  "expenses.edit",
  "expenses.delete",
  "expenses.manage",
  "reports.view",
  "reports.financial",
  "team.view",
  "team.invite",
  "team.edit_role",
  "team.suspend",
  "settings.view",
  "settings.edit",
] as const;

export type Permission = (typeof PERMISSION_LIST)[number];

const MANAGER_PERMISSIONS: readonly Permission[] = [
  "dashboard.view",
  "sales.view",
  "sales.create",
  "sales.edit",
  "sales.cancel",
  "sales.list_all",
  "sales.cancel_own",
  "customers.view",
  "customers.create",
  "customers.edit",
  "customers.delete",
  "products.view",
  "products.create",
  "products.edit",
  "products.delete",
  "products.manage",
  "stock.view",
  "stock.adjust",
  "purchases.view",
  "purchases.create",
  "purchases.edit",
  "purchases.cancel",
  "purchases.manage",
  "suppliers.view",
  "suppliers.create",
  "suppliers.edit",
  "expenses.view",
  "expenses.create",
  "expenses.edit",
  "expenses.delete",
  "expenses.manage",
  "reports.view",
  "reports.financial",
  "team.view",
  "settings.view",
];

const CASHIER_PERMISSIONS: readonly Permission[] = [
  "dashboard.view",
  "sales.view",
  "sales.create",
  "sales.cancel_own",
  "customers.view",
  "customers.create",
  "customers.edit",
  "products.view",
  "expenses.view",
  "expenses.create",
  "settings.view",
];

const SELLER_PERMISSIONS: readonly Permission[] = [
  "dashboard.view",
  "sales.view",
  "sales.create",
  "customers.view",
  "customers.create",
  "products.view",
  "settings.view",
];

const STOCK_MANAGER_PERMISSIONS: readonly Permission[] = [
  "dashboard.view",
  "products.view",
  "products.create",
  "products.edit",
  "products.delete",
  "products.manage",
  "stock.view",
  "stock.adjust",
  "purchases.view",
  "purchases.create",
  "purchases.edit",
  "purchases.cancel",
  "purchases.manage",
  "suppliers.view",
  "suppliers.create",
  "suppliers.edit",
  "settings.view",
];

export const ROLE_PERMISSIONS: Record<BusinessRole, readonly Permission[] | "*"> = {
  owner: "*",
  manager: MANAGER_PERMISSIONS,
  cashier: CASHIER_PERMISSIONS,
  seller: SELLER_PERMISSIONS,
  stock_manager: STOCK_MANAGER_PERMISSIONS,
};

export const ASSIGNABLE_ROLES = ["manager", "cashier", "seller", "stock_manager"] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSION_LIST as readonly string[]).includes(value);
}

export function isAssignableRole(value: string): value is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(value);
}

export function hasPermission(role: BusinessRole, permission: Permission) {
  const granted = ROLE_PERMISSIONS[role];

  if (granted === "*") {
    return true;
  }

  return granted.includes(permission);
}

export function can(role: BusinessRole, permission: Permission) {
  return hasPermission(role, permission);
}

export function canViewFinancialReports(role: BusinessRole) {
  return hasPermission(role, "reports.financial");
}

export function canCancelSale(role: BusinessRole, isOwnSale: boolean) {
  if (hasPermission(role, "sales.cancel")) {
    return true;
  }

  return hasPermission(role, "sales.cancel_own") && isOwnSale;
}

export function permissionsFor(role: BusinessRole): readonly Permission[] | "*" {
  return ROLE_PERMISSIONS[role];
}
