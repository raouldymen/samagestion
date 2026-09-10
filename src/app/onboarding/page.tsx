import type { Metadata } from "next";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Configurer votre activité",
};

export default function OnboardingPage() {
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
    </Card>
  );
}
