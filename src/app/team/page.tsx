import type { Metadata } from "next";
import Link from "next/link";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { PermissionGuard } from "@/components/team/permission-guard";
import { ResendInvitationButton } from "@/components/team/resend-invitation-button";
import { TeamMemberCard } from "@/components/team/team-member-card";
import { TeamTable } from "@/components/team/team-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { hasPermission } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/access";
import { ROLE_LABELS } from "@/lib/team/labels";
import { listInvitations, listTeamMembers } from "@/lib/team/queries";

export const metadata: Metadata = {
  title: "Équipe",
};

export default async function TeamPage() {
  const session = await requirePermission("team.view");
  const [members, invitations] = await Promise.all([listTeamMembers(), listInvitations()]);
  const pendingInvites = invitations.filter((item) => item.status === "pending" || item.status === "expired");
  const canInvite = hasPermission(session.role, "team.invite");

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Équipe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {members.length} membre{members.length > 1 ? "s" : ""}
          </p>
        </div>
        {canInvite ? <InviteMemberDialog /> : null}
      </div>
      <div className="hidden lg:block">
        <PageHeader
          title="Équipe"
          description="Gérez les membres de votre commerce."
          actions={
            <div className="flex gap-2">
              <Button href="/team/activity" variant="outline">
                Activité
              </Button>
              {canInvite ? <InviteMemberDialog /> : null}
            </div>
          }
        />
      </div>

      <div className="mb-4 flex justify-end lg:hidden">
        <Button href="/team/activity" variant="outline" size="sm">
          Activité
        </Button>
      </div>

      <div className="grid gap-3 lg:hidden">
        {members.map((member) => (
          <TeamMemberCard key={member.id} member={member} />
        ))}
      </div>
      <TeamTable members={members} />

      {pendingInvites.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-base font-semibold">Invitations</h2>
          <div className="flex flex-col gap-3">
            {pendingInvites.map((invite) => (
              <Card key={invite.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{invite.email}</p>
                  <p className="text-sm text-muted-foreground">
                    {ROLE_LABELS[invite.role]} · {invite.status === "expired" ? "Expirée" : "En attente"}
                  </p>
                  {invite.status === "pending" ? (
                    <p className="mt-1 break-all text-xs text-muted-foreground">{invite.acceptUrl}</p>
                  ) : null}
                </div>
                <PermissionGuard permission="team.invite">
                  <ResendInvitationButton
                    invitationId={invite.id}
                    expired={invite.status === "expired"}
                  />
                </PermissionGuard>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      <p className="mt-6 hidden text-sm text-muted-foreground lg:block">
        <Link href="/team/activity" className="text-primary hover:underline">
          Voir l&apos;historique d&apos;activité
        </Link>
      </p>
    </>
  );
}
