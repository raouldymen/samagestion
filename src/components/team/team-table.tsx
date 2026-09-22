import Link from "next/link";
import { MemberActions } from "@/components/team/member-actions";
import { MemberPresenceBadge } from "@/components/team/team-presence";
import { MemberStatusBadge } from "@/components/team/member-status-badge";
import { ROLE_LABELS } from "@/lib/team/labels";
import { formatDateTime } from "@/lib/utils/format";
import type { TeamMember } from "@/types/team";

export function TeamTable({ members }: { members: TeamMember[] }) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border bg-card lg:block">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="border-b border-border text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Membre</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Rôle</th>
            <th className="px-4 py-3 font-medium">Statut</th>
            <th className="px-4 py-3 font-medium">Connexion</th>
            <th className="px-4 py-3 font-medium">Dernière activité</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {members.map((member) => (
            <tr key={member.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium">
                <Link href={`/team/${member.id}`} className="hover:text-primary hover:underline">
                  {member.fullName}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
              <td className="px-4 py-3">{ROLE_LABELS[member.role]}</td>
              <td className="px-4 py-3">
                <MemberStatusBadge status={member.status} />
              </td>
              <td className="px-4 py-3">
                <MemberPresenceBadge userId={member.userId} />
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDateTime(member.lastActivityAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/team/${member.id}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Gérer
                  </Link>
                  <MemberActions member={member} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
