"use client";

import { Avatar } from "@/components/ui/avatar";
import { PlanBadge } from "@/components/subscriptions/plan-badge";
import { useBusiness } from "@/hooks/use-business";
import { useUser } from "@/hooks/use-user";
import type { PlanSlug } from "@/types/subscriptions";

export function DashboardHeader({ planSlug = "free" }: { planSlug?: PlanSlug }) {
  const { user } = useUser();
  const { business } = useBusiness();

  return (
    <header className="mb-6 flex items-start justify-between gap-3 sm:mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Bonjour {user.fullName} 👋
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground sm:text-base">
          <span>Voici un aperçu de {business.name}.</span>
          <PlanBadge slug={planSlug} />
        </p>
      </div>
      <div className="hidden lg:flex">
        <Avatar name={user.fullName} />
      </div>
    </header>
  );
}
