import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { isPlatformAdmin } from "@/lib/admin/access";
import { signOut } from "@/lib/auth/actions";

export const metadata: Metadata = {
  title: "Configurer votre activité",
};

export default async function OnboardingPage() {
  if (await isPlatformAdmin()) {
    redirect("/admin/payments");
  }

  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo href="/" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          Bienvenue sur SamaGestion 👋
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Votre plan Gratuit sera activé automatiquement. Vous pouvez commencer
          immédiatement — sans payer.
        </p>
      </div>
      <OnboardingForm />
      <form action={signOut} className="mt-3">
        <Button type="submit" variant="outline" size="lg" className="w-full">
          Retour
        </Button>
      </form>
    </Card>
  );
}
