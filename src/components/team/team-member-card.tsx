import Link from "next/link";
import { MemberActions } from "@/components/team/member-actions";
import { MemberStatusBadge } from "@/components/team/member-status-badge";
import { Card } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/team/labels";
import type { TeamMember } from "@/types/team";

export function TeamMemberCard({ member }: { member: TeamMember }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{member.fullName}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {ROLE_LABELS[member.role]} · {member.status === "active" ? "Actif" : null}
          </p>
        </div>
        <MemberActions member={member} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <MemberStatusBadge status={member.status} />
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{member.email}</p>
      <Link
        href={`/team/${member.id}`}
        className="mt-4 inline-flex h-10 items-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted"
      >
        Gérer
      </Link>
    </Card>
  );
}
