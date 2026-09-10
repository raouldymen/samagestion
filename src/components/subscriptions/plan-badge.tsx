import { Badge } from "@/components/ui/badge";
import type { PlanSlug } from "@/types/subscriptions";
import { cn } from "@/lib/utils/cn";

const LABELS: Record<PlanSlug, string> = {
  free: "FREE",
  pro: "PRO",
  business: "BUSINESS",
};

const VARIANTS: Record<PlanSlug, "neutral" | "default" | "success"> = {
  free: "neutral",
  pro: "default",
  business: "success",
};

export function PlanBadge({
  slug,
  className,
}: {
  slug: PlanSlug;
  className?: string;
}) {
  return (
    <Badge variant={VARIANTS[slug]} className={cn("uppercase tracking-wide", className)}>
      {LABELS[slug]}
    </Badge>
  );
}
