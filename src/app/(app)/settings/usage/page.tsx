import type { Metadata } from "next";
import { UsageBar } from "@/components/subscriptions/usage-bar";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { requireSettingsSection } from "@/lib/settings/access";
import { usageMeters } from "@/lib/subscriptions/limits";
import { getSubscriptionBundle } from "@/lib/subscriptions/queries";

export const metadata: Metadata = {
  title: "Utilisation",
};

export default async function UsageSettingsPage() {
  await requireSettingsSection("usage");
  const bundle = await getSubscriptionBundle();
  const meters = usageMeters(bundle);
  const overLimit = meters.some((meter) => meter.blocked && bundle.plan.slug === "free");

  return (
    <>
      <PageHeader
        title="Utilisation"
        description={`Plan ${bundle.plan.name} — suivez vos quotas.`}
      />
      {overLimit ? (
        <div className="mb-4 rounded-xl border border-danger/30 bg-danger-soft p-4 text-sm">
          <p className="font-semibold">Votre abonnement a été rétrogradé ou une limite est dépassée.</p>
          <p className="mt-1 text-muted-foreground">
            Aucune donnée n&apos;a été supprimée. Archivez des éléments ou repassez à Pro pour
            créer de nouveaux enregistrements.
          </p>
          <Button href="/upgrade" className="mt-3" size="sm">
            Voir les offres
          </Button>
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {meters.map((meter) => (
          <UsageBar key={meter.key} meter={meter} />
        ))}
      </div>
    </>
  );
}
