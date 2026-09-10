import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS } from "@/lib/notifications/rules";
import type { NotificationPriority } from "@/types/notifications";

const VARIANT: Record<NotificationPriority, "danger" | "warning" | "neutral"> = {
  critical: "danger",
  high: "warning",
  medium: "neutral",
  low: "neutral",
};

export function NotificationBadge({
  priority,
  count,
}: {
  priority?: NotificationPriority;
  count?: number;
}) {
  if (typeof count === "number") {
    if (count <= 0) {
      return null;
    }

    return (
      <span className="absolute -top-1 -right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
        {count > 9 ? "9+" : count}
      </span>
    );
  }

  if (!priority) {
    return null;
  }

  return <Badge variant={VARIANT[priority]}>{PRIORITY_LABELS[priority]}</Badge>;
}
