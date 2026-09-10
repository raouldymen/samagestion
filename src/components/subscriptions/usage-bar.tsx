import { PlanBadge } from "@/components/subscriptions/plan-badge";
import type { UsageMeter } from "@/types/subscriptions";
import { cn } from "@/lib/utils/cn";

export function UsageBar({ meter }: { meter: UsageMeter }) {
  const percent = meter.unlimited
    ? 0
    : Math.min(100, Math.round(((meter.used / (meter.limit || 1)) * 100)));

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">{meter.label}</p>
        <p className="text-sm text-muted-foreground">
          {meter.unlimited ? (
            <>
              {meter.used} / Illimité
            </>
          ) : (
            <>
              {meter.used} / {meter.limit}
            </>
          )}
        </p>
      </div>
      {!meter.unlimited ? (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              meter.blocked ? "bg-danger" : meter.warning ? "bg-amber-500" : "bg-primary",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      ) : null}
      {meter.warning && !meter.blocked ? (
        <p className="mt-2 text-sm text-amber-700">Vous approchez de la limite.</p>
      ) : null}
      {meter.blocked ? (
        <p className="mt-2 text-sm text-danger">
          Limite atteinte. Passez à Pro pour continuer.
        </p>
      ) : null}
    </div>
  );
}

export function PlanLimitBanner({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-semibold">{title}</p>
        <PlanBadge slug="pro" />
      </div>
      <p className="mt-1">{description}</p>
    </div>
  );
}
