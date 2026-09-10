import type { Metadata } from "next";
import { getPlatformRevenueSnapshot } from "@/lib/admin/metrics";
import { formatFcfaAbsolute } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Admin paiements",
};

/**
 * Vue financière réservée aux administrateurs de plateforme.
 */
export default async function AdminPaymentsPage() {
  const snapshot = await getPlatformRevenueSnapshot();

  const metrics = [
    ["MRR", formatFcfaAbsolute(snapshot.mrr)],
    ["ARR", formatFcfaAbsolute(snapshot.arr)],
    ["Abonnés payants", String(snapshot.paidSubscribers)],
    ["Commerces Free", String(snapshot.freeSubscribers)],
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <p className="text-sm font-medium text-primary">Administration plateforme</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Paiements et abonnements</h1>
      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map(([label, value]) => (
          <article key={label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-xl font-semibold">{value}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
