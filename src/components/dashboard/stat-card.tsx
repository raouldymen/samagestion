import type { LucideIcon } from "lucide-react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  HandCoins,
  Minus,
  ShoppingBag,
  Sparkles,
  Truck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { StatMetric, StatMetricId } from "@/types";

const STAT_ICONS: Record<StatMetricId, LucideIcon> = {
  revenue: Banknote,
  profit: TrendingUp,
  expense: Wallet,
  receivable: HandCoins,
  margin: TrendingUp,
  salesCount: ShoppingBag,
  avgBasket: ShoppingBag,
  collected: Banknote,
  purchases: Truck,
  payable: HandCoins,
};

export function StatCard({ metric }: { metric: StatMetric }) {
  const Icon = STAT_ICONS[metric.id];
  const trend = metric.trend;

  return (
    <Card className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{metric.label}</p>
        <p className="mt-2 text-lg font-semibold tracking-tight text-foreground sm:text-2xl">
          {metric.suffix ? `${metric.amount} ${metric.suffix}` : formatFcfaAbsolute(metric.amount)}
        </p>
        {trend ? (
          <p
            className={cn(
              "mt-1.5 flex items-center gap-1 text-xs font-medium",
              trend.direction === "up" && "text-success",
              trend.direction === "down" && "text-danger",
              (trend.direction === "flat" || trend.direction === "new") && "text-muted-foreground",
            )}
          >
            {trend.direction === "up" ? (
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            ) : null}
            {trend.direction === "down" ? (
              <ArrowDownRight className="size-3.5" aria-hidden="true" />
            ) : null}
            {trend.direction === "flat" ? <Minus className="size-3.5" aria-hidden="true" /> : null}
            {trend.direction === "new" ? <Sparkles className="size-3.5" aria-hidden="true" /> : null}
            <span>
              {trend.label}
              {trend.percent !== null ? (
                <span className="ml-1 font-normal text-muted-foreground">vs période précédente</span>
              ) : null}
            </span>
          </p>
        ) : null}
      </div>
      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
    </Card>
  );
}
