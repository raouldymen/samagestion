import type { ActivityItem, StatMetric } from "@/types";

/**
 * Données fictives du tableau de bord.
 * À remplacer par les requêtes Supabase dans une prochaine étape.
 */
export const DASHBOARD_STATS: StatMetric[] = [
  {
    id: "revenue",
    label: "Chiffre d'affaires",
    amount: 485_000,
  },
  {
    id: "profit",
    label: "Bénéfice",
    amount: 160_000,
  },
  {
    id: "expense",
    label: "Dépenses",
    amount: 35_000,
  },
  {
    id: "receivable",
    label: "Créances",
    amount: 75_000,
  },
];

export const RECENT_ACTIVITY: ActivityItem[] = [
  {
    id: "act-125",
    type: "sale",
    title: "Vente #000125",
    amount: 25_000,
    occurredAt: "2026-08-27T10:24:00",
  },
  {
    id: "act-124",
    type: "sale",
    title: "Vente #000124",
    amount: 15_000,
    occurredAt: "2026-08-27T09:12:00",
  },
  {
    id: "act-exp-1",
    type: "expense",
    title: "Dépense",
    amount: -5_000,
    occurredAt: "2026-08-26T16:45:00",
  },
  {
    id: "act-123",
    type: "sale",
    title: "Vente #000123",
    amount: 8_500,
    occurredAt: "2026-08-26T14:05:00",
  },
];
