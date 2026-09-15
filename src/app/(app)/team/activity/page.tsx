import type { Metadata } from "next";
import { UpgradeCard } from "@/components/subscriptions/upgrade-card";
import { ActivityLog } from "@/components/team/activity-log";
import { PageHeader } from "@/components/ui/page-header";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from "@/lib/team/labels";
import { listAuditLogs, listTeamMembers } from "@/lib/team/queries";
import { getSubscriptionBundle } from "@/lib/subscriptions/queries";
import { hasFeature } from "@/lib/subscriptions/limits";

export const metadata: Metadata = {
  title: "Activité",
};

type SearchParams = Promise<{
  user?: string;
  action?: string;
  type?: string;
  from?: string;
  to?: string;
}>;

export default async function TeamActivityPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const bundle = await getSubscriptionBundle();

  if (!hasFeature(bundle.features, "audit_logs")) {
    return (
      <UpgradeCard
        title="Journal d'audit Business"
        description="L'historique d'activité avancé est réservé au plan Business."
        ctaHref="/upgrade?feature=audit_logs"
        ctaLabel="Choisir Business"
      />
    );
  }

  const params = await searchParams;
  const [members, logs] = await Promise.all([
    listTeamMembers(),
    listAuditLogs({
      userId: params.user,
      action: params.action,
      entityType: params.type,
      from: params.from,
      to: params.to,
    }),
  ]);

  const actions = Object.keys(AUDIT_ACTION_LABELS);
  const types = Object.keys(AUDIT_ENTITY_LABELS);

  return (
    <>
      <PageHeader
        title="Historique d'activité"
        description="Les actions importantes de l'équipe."
      />
      <form className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Utilisateur</span>
          <select
            name="user"
            defaultValue={params.user ?? ""}
            className="h-12 rounded-lg border border-border bg-card px-3"
          >
            <option value="">Tous</option>
            {members.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.fullName}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Action</span>
          <select
            name="action"
            defaultValue={params.action ?? ""}
            className="h-12 rounded-lg border border-border bg-card px-3"
          >
            <option value="">Toutes</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {AUDIT_ACTION_LABELS[action]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Type</span>
          <select
            name="type"
            defaultValue={params.type ?? ""}
            className="h-12 rounded-lg border border-border bg-card px-3"
          >
            <option value="">Tous</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {AUDIT_ENTITY_LABELS[type]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Date</span>
          <input
            type="date"
            name="from"
            defaultValue={params.from ?? ""}
            className="h-12 rounded-lg border border-border bg-card px-3"
          />
        </label>
        <div className="sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Filtrer
          </button>
        </div>
      </form>
      <ActivityLog logs={logs} />
    </>
  );
}
