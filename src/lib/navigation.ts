import {
  BarChart3,
  Banknote,
  ClipboardList,
  Home,
  History,
  LayoutDashboard,
  LifeBuoy,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Truck,
  UserCog,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import type { NavItem } from "@/types";
import type { BusinessRole } from "@/types/database";

export const DESKTOP_NAV: NavItem[] = [
  { href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard, permission: "dashboard.view" },
  { href: "/sales", label: "Ventes", icon: ShoppingCart, permission: "sales.view" },
  { href: "/sales/checkout", label: "Caisse", icon: Banknote, permission: "sales.create", roles: ["cashier"] },
  { href: "/sales/checkout/closures", label: "Clôtures caisse", icon: Banknote, permission: "sales.view", roles: ["owner", "manager", "cashier"], requiresActiveCashier: true },
  { href: "/purchases", label: "Achats", icon: Truck, permission: "purchases.view" },
  { href: "/products", label: "Produits", icon: Package, permission: "products.view" },
  { href: "/products/inventory", label: "Inventaire", icon: ClipboardList, permission: "stock.adjust" },
  { href: "/customers", label: "Clients", icon: Users, permission: "customers.view" },
  { href: "/expenses", label: "Dépenses", icon: Wallet, permission: "expenses.view" },
  { href: "/reports", label: "Rapports", icon: BarChart3, permission: "reports.view" },
  { href: "/team", label: "Équipe", icon: UserCog, permission: "team.view" },
  { href: "/team/activity", label: "Activité", icon: History, permission: "team.view" },
  { href: "/support", label: "Support", icon: LifeBuoy },
  { href: "/settings", label: "Paramètres", icon: Settings, permission: "settings.view" },
];

export const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Accueil", icon: Home, permission: "dashboard.view" },
  { href: "/sales", label: "Ventes", icon: ShoppingCart, permission: "sales.view" },
  { href: "/products", label: "Produits", icon: Warehouse, permission: "products.view" },
  { href: "/purchases", label: "Achats", icon: Truck, permission: "purchases.view" },
];

export const PLUS_NAV: NavItem[] = [
  { href: "/sales/new", label: "Nouvelle vente", icon: ShoppingCart, permission: "sales.create" },
  { href: "/sales/checkout", label: "Caisse", icon: Banknote, permission: "sales.create", roles: ["cashier"] },
  { href: "/sales/checkout/closures", label: "Clôtures caisse", icon: Banknote, permission: "sales.view", roles: ["owner", "manager", "cashier"], requiresActiveCashier: true },
  { href: "/purchases/new", label: "Nouvel achat", icon: Truck, permission: "purchases.create" },
  { href: "/products/inventory", label: "Inventaire physique", icon: ClipboardList, permission: "stock.adjust" },
  { href: "/customers", label: "Clients", icon: Users, permission: "customers.view" },
  { href: "/expenses", label: "Dépenses", icon: Wallet, permission: "expenses.view" },
  { href: "/reports", label: "Rapports", icon: BarChart3, permission: "reports.view" },
  { href: "/team", label: "Équipe", icon: UserCog, permission: "team.view" },
  { href: "/team/activity", label: "Activité", icon: History, permission: "team.view" },
  { href: "/settings", label: "Paramètres", icon: Settings, permission: "settings.view" },
  { href: "/settings/receipts", label: "Réglages des reçus", icon: ReceiptText, permission: "settings.view" },
  { href: "/support", label: "Support", icon: LifeBuoy },
];

export function navForRole(items: NavItem[], role: BusinessRole, hasActiveCashier = false) {
  return items.filter((item) => {
    if (item.requiresActiveCashier && role !== "cashier" && !hasActiveCashier) {
      return false;
    }
    if (item.roles && !item.roles.includes(role)) {
      return false;
    }

    if (!item.permission) {
      return true;
    }

    return hasPermission(role, item.permission as Permission);
  });
}

export function isNavActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
