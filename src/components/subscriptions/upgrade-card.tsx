import Link from "next/link";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function UpgradeCard({
  title = "Fonctionnalité Pro",
  description,
  ctaHref = "/upgrade",
  ctaLabel = "Passer à Pro",
}: {
  title?: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <Card className="mx-auto max-w-lg py-8 text-center">
      <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Lock className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex justify-center gap-2">
        <Button href={ctaHref}>{ctaLabel}</Button>
        <Button href="/pricing" variant="outline">
          Voir les offres
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        <Link href="/settings/subscription" className="text-primary hover:underline">
          Gérer mon abonnement
        </Link>
      </p>
    </Card>
  );
}
