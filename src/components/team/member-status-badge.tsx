import { Badge } from "@/components/ui/badge";
import { MEMBER_STATUS_LABELS } from "@/lib/team/labels";
import type { MemberStatus } from "@/types/team";

const VARIANTS: Record<MemberStatus, "success" | "warning" | "neutral"> = {
  active: "success",
  invited: "warning",
  suspended: "neutral",
};

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  return <Badge variant={VARIANTS[status]}>{MEMBER_STATUS_LABELS[status]}</Badge>;
}
