import Link from "next/link";
import {
  Bell,
  ChevronRight,
  CreditCard,
  FileText,
  Gauge,
  Settings2,
  Shield,
  Store,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import type { BusinessRole } from "@/types/database";

const SECTIONS: {
  href: string;
  label: string;
  description: string;
  icon: typeof Store;
  permission?: Permission;
}[] = [
  {
    href: "/settings/business",
    label: "Commerce",
    description: "Nom, logo, adresse, téléphone et devise.",
    icon: Store,
  },
  {
    href: "/settings/subscription",
    label: "Abonnement",
    description: "Plan actuel, renouvellement et upgrade.",
    icon: CreditCard,
  },
  {
    href: "/settings/usage",
    label: "Utilisation",
    description: "Quotas produits, ventes, clients et membres.",
    icon: Gauge,
  },
  {
    href: "/settings/billing",
    label: "Facturation",
    description: "Historique des paiements.",
    icon: CreditCard,
  },
  {
    href: "/team",
    label: "Utilisateurs & équipe",
    description: "Membres, rôles et accès.",
    icon: Users,
    permission: "team.view",
  },
  {
    href: "/settings/notifications",
    label: "Notifications",
    description: "Alertes stock, dettes, ventes et achats.",
    icon: Bell,
  },
  {
    href: "/settings/receipts",
    label: "Reçus",
    description: "Personnalisation, numérotation et format d'impression.",
    icon: FileText,
  },
  {
    href: "/settings/security",
    label: "Sécurité",
    description: "Mot de passe du compte.",
    icon: Shield,
  },
  {
    href: "/settings/preferences",
    label: "Préférences",
    description: "Langue, dates, nombres et fuseau horaire.",
    icon: Settings2,
  },
];

export function SettingsNav({ role }: { role: BusinessRole }) {
  const items = SECTIONS.filter(
    (item) => !item.permission || hasPermission(role, item.permission),
  );

  return (
    <nav aria-label="Paramètres">
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link href={item.href}>
                <Card className="flex items-center gap-3 py-4 transition-colors hover:bg-muted">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{item.label}</span>
                    <span className="block text-sm text-muted-foreground">{item.description}</span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
