import { AuthenticatedShell } from "@/components/layout/authenticated-shell";
import { UpgradeCard } from "@/components/subscriptions/upgrade-card";
import { requirePermission } from "@/lib/auth/access";
import { getSubscriptionBundle } from "@/lib/subscriptions/queries";
import { hasFeature } from "@/lib/subscriptions/limits";

export const dynamic = "force-dynamic";

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePermission("team.view");
  const bundle = await getSubscriptionBundle();

  if (!hasFeature(bundle.features, "team_management")) {
    return (
      <AuthenticatedShell>
        <UpgradeCard
          title="Fonctionnalité Pro"
          description="La gestion d'équipe est disponible à partir du plan Pro. Invitez jusqu'à 5 collaborateurs et contrôlez leurs accès."
          ctaHref="/upgrade?feature=team_management"
          ctaLabel="Passer à Pro"
        />
      </AuthenticatedShell>
    );
  }

  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}
