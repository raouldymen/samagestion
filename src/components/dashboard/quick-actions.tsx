"use client";

import { PackagePlus, ShoppingCart, Truck, Wallet } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { useBusiness } from "@/hooks/use-business";

const ACTIONS: { href: string; label: string; icon: typeof ShoppingCart; permission: Permission }[] = [
  {
    href: "/sales/new",
    label: "Nouvelle vente",
    icon: ShoppingCart,
    permission: "sales.create",
  },
  {
    href: "/products/new",
    label: "Ajouter un produit",
    icon: PackagePlus,
    permission: "products.create",
  },
  {
    href: "/purchases/new",
    label: "Nouvel achat",
    icon: Truck,
    permission: "purchases.create",
  },
  {
    href: "/expenses/new",
    label: "Ajouter une dépense",
    icon: Wallet,
    permission: "expenses.create",
  },
];

export function QuickActions() {
  const { role } = useBusiness();
  const actions = ACTIONS.filter((action) => hasPermission(role, action.permission));

  if (actions.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="quick-actions-title">
      <Card>
        <CardHeader>
          <CardTitle id="quick-actions-title">Actions rapides</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.href}
                href={action.href}
                className="flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted/60 px-3 py-4 text-center text-sm font-medium text-foreground transition-colors hover:border-primary/20 hover:bg-primary-soft hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="size-5" aria-hidden="true" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
