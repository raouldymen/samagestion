import type { Metadata } from "next";
import { PricingCards } from "@/components/subscriptions/pricing-cards";
import { PricingComparison } from "@/components/subscriptions/pricing-comparison";
import { Logo } from "@/components/ui/logo";
import { getAuthUser } from "@/lib/auth/session";
import { listSubscriptionPlans } from "@/lib/subscriptions/queries";
import { getSubscriptionBundle } from "@/lib/subscriptions/queries";

export const metadata: Metadata = {
  title: "Tarifs",
};

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const user = await getAuthUser();
  const plans = await listSubscriptionPlans();
  let currentSlug: "free" | "pro" | "business" | undefined;

  if (user) {
    try {
      const bundle = await getSubscriptionBundle();
      currentSlug = bundle.plan.slug;
    } catch {
      currentSlug = undefined;
    }
  }

  return (
    <div className="min-h-dvh bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex justify-center">
          <Logo href={user ? "/dashboard" : "/"} />
        </div>
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">SamaGestion</h1>
          <p className="mt-2 text-muted-foreground">
            Choisissez le plan adapté à votre activité.
          </p>
        </div>
        <PricingCards plans={plans} currentSlug={currentSlug} authenticated={Boolean(user)} />
        <PricingComparison />
      </div>
    </div>
  );
}
