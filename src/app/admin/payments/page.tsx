import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { getPlatformRevenueSnapshot } from "@/lib/admin/metrics";
import type { AdminPlanSlug, AdminSubscriptionRow } from "@/lib/payments/metrics";
import { formatDateTime, formatFcfaAbsolute } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Admin paiements",
};

const PLAN_ORDER: AdminPlanSlug[] = ["free", "pro", "business"];

const PLAN_LABELS: Record<AdminPlanSlug, string> = {
  free: "Gratuit",
  pro: "Pro",
  business: "Business",
};

const PLAN_BADGE: Record<AdminPlanSlug, "neutral" | "default" | "success"> = {
  free: "neutral",
  pro: "default",
  business: "success",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  trialing: "Essai",
  past_due: "Impayé",
  cancelled: "Annulé",
};

/**
 * Vue financière réservée aux administrateurs de plateforme.
 */
export default async function AdminPaymentsPage() {
  const snapshot = await getPlatformRevenueSnapshot();
  const byPlan = Object.fromEntries(
    PLAN_ORDER.map((plan) => [plan, snapshot.subscriptions.filter((row) => row.plan === plan)]),
  ) as Record<AdminPlanSlug, AdminSubscriptionRow[]>;

  const metrics = [
    ["Gratuit", String(snapshot.freeSubscribers)],
    ["Pro", String(snapshot.proSubscribers)],
    ["Business", String(snapshot.businessSubscribers)],
    ["MRR", formatFcfaAbsolute(snapshot.mrr)],
    ["ARR", formatFcfaAbsolute(snapshot.arr)],
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-sm font-medium text-primary">Administration plateforme</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Paiements et abonnements</h1>
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map(([label, value]) => (
          <article key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-xl font-semibold">{value}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 grid gap-4">
        {PLAN_ORDER.map((plan) => (
          <article key={plan} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold">{PLAN_LABELS[plan]}</h2>
              <Badge variant={PLAN_BADGE[plan]}>
                {byPlan[plan].length} commerce{byPlan[plan].length > 1 ? "s" : ""}
              </Badge>
            </div>
            {byPlan[plan].length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Aucun commerce sur cette formule.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {byPlan[plan].map((row) => (
                  <li key={row.businessId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                    <p className="font-medium">{row.businessName}</p>
                    <p className="text-muted-foreground">
                      {STATUS_LABELS[row.status] ?? row.status}
                      {row.periodEnd ? ` · jusqu’au ${formatDateTime(row.periodEnd)}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
