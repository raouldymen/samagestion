import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlanBadge } from "@/components/subscriptions/plan-badge";
import { formatFcfaAbsolute } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";
import type { PlanSlug, SubscriptionPlan } from "@/types/subscriptions";

function planHighlights(slug: PlanSlug, plan: SubscriptionPlan): string[] {
  const f = plan.features;
  const lines: string[] = [];
  const products = f.products?.limit;
  const sales = f.sales_monthly?.limit;
  const members = f.team_members?.limit;

  lines.push(products == null ? "Produits illimités" : `${products} produits`);
  lines.push(sales == null ? "Ventes illimitées" : `${sales} ventes / mois`);
  if (f.financial_reports?.enabled) {
    lines.push("Rapports financiers");
  } else {
    lines.push("Stock & reçus");
  }
  if (f.exports?.enabled) {
    lines.push("Exports");
  }
  if (f.team_management?.enabled) {
    lines.push(members == null ? "Équipe illimitée" : `Équipe (${members} membres)`);
  }
  if (f.audit_logs?.enabled) {
    lines.push("Audit avancé");
  }
  if (f.priority_support?.enabled) {
    lines.push("Support prioritaire");
  }
  return lines;
}

export function PricingCards({
  plans,
  currentSlug,
  authenticated,
}: {
  plans: SubscriptionPlan[];
  currentSlug?: PlanSlug;
  authenticated: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {plans.map((plan) => {
        const popular = plan.slug === "pro";
        const current = currentSlug === plan.slug;
        const highlights = planHighlights(plan.slug, plan);
        const href =
          plan.slug === "free"
            ? authenticated
              ? "/dashboard"
              : "/register"
            : authenticated
              ? `/checkout?plan=${plan.slug}`
              : "/register";
        const cta =
          plan.slug === "free"
            ? "Commencer gratuitement"
            : plan.slug === "pro"
              ? "Passer à Pro"
              : "Choisir Business";

        return (
          <Card
            key={plan.id}
            className={cn(
              "relative flex flex-col",
              popular && "border-primary shadow-md ring-1 ring-primary/20",
            )}
          >
            {popular ? (
              <p className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                Le plus populaire
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <PlanBadge slug={plan.slug} />
            </div>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {formatFcfaAbsolute(plan.priceMonthly)}
              {plan.priceMonthly > 0 ? (
                <span className="text-sm font-normal text-muted-foreground"> / mois</span>
              ) : null}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{plan.description}</p>
            <ul className="mt-5 flex flex-1 flex-col gap-2 text-sm">
              {highlights.map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {current ? (
                <Button variant="outline" className="w-full" disabled>
                  Plan actuel
                </Button>
              ) : (
                <Button href={href} className="w-full" variant={popular ? "primary" : "outline"}>
                  {cta}
                </Button>
              )}
            </div>
            {!authenticated && plan.slug !== "free" ? (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline">
                  Déjà un compte ? Connectez-vous
                </Link>
              </p>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}
