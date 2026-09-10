import {
  BarChart3,
  Home,
  LayoutDashboard,
  Package,
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
  { href: "/purchases", label: "Achats", icon: Truck, permission: "purchases.view" },
  { href: "/products", label: "Produits", icon: Package, permission: "products.view" },
  { href: "/customers", label: "Clients", icon: Users, permission: "customers.view" },
  { href: "/expenses", label: "Dépenses", icon: Wallet, permission: "expenses.view" },
  { href: "/reports", label: "Rapports", icon: BarChart3, permission: "reports.view" },
  { href: "/team", label: "Équipe", icon: UserCog, permission: "team.view" },
  { href: "/settings", label: "Paramètres", icon: Settings, permission: "settings.view" },
];

export const MOBILE_NAV: NavItem[] = [
  { href: "/dashboard", label: "Accueil", icon: Home, permission: "dashboard.view" },
  { href: "/sales", label: "Ventes", icon: ShoppingCart, permission: "sales.view" },
  { href: "/products", label: "Stock", icon: Warehouse, permission: "products.view" },
  { href: "/purchases", label: "Achats", icon: Truck, permission: "purchases.view" },
];

export const PLUS_NAV: NavItem[] = [
  { href: "/sales/new", label: "Nouvelle vente", icon: ShoppingCart, permission: "sales.create" },
  { href: "/purchases/new", label: "Nouvel achat", icon: Truck, permission: "purchases.create" },
  { href: "/products", label: "Produits", icon: Package, permission: "products.view" },
  { href: "/expenses", label: "Dépenses", icon: Wallet, permission: "expenses.view" },
  { href: "/team", label: "Équipe", icon: UserCog, permission: "team.view" },
];

export function navForRole(items: NavItem[], role: BusinessRole) {
  return items.filter((item) => {
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
