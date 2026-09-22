import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MemberActions } from "@/components/team/member-actions";
import { MemberPresenceBadge } from "@/components/team/team-presence";
import { MemberStatusBadge } from "@/components/team/member-status-badge";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ROLE_LABELS } from "@/lib/team/labels";
import { getTeamMember } from "@/lib/team/queries";
import { formatDate, formatDateTime } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Membre",
};

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await getTeamMember(id);

  if (!member) {
    notFound();
  }

  return (
    <>
      <PageHeader title={member.fullName} description="Profil du membre" />
      <Card className="max-w-xl">
        <dl className="grid gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Nom</dt>
            <dd className="mt-1 font-medium">{member.fullName}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="mt-1 font-medium">{member.email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Rôle</dt>
            <dd className="mt-1 font-medium">{ROLE_LABELS[member.role]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Statut</dt>
            <dd className="mt-1">
              <MemberStatusBadge status={member.status} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Connexion</dt>
            <dd className="mt-1">
              <MemberPresenceBadge userId={member.userId} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Date d&apos;arrivée</dt>
            <dd className="mt-1 font-medium">{formatDate(member.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Dernière activité</dt>
            <dd className="mt-1 font-medium">{formatDateTime(member.lastActivityAt)}</dd>
          </div>
        </dl>
        <div className="mt-6">
          <MemberActions member={member} />
        </div>
      </Card>
    </>
  );
}
