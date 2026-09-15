import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { getAuthUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gérez votre activité simplement",
};

export default async function HomePage() {
  const user = await getAuthUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <main className="flex w-full max-w-md flex-col items-center text-center">
        <Logo href="/" size="lg" />
        <h1 className="mt-8 text-3xl font-semibold tracking-tight text-foreground">
          Gérez votre activité simplement.
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          SamaGestion aide les commerçants et entrepreneurs à suivre leurs ventes,
          stocks et clients, depuis le téléphone.
        </p>
        <div className="mt-8 flex w-full flex-col gap-3">
          <Button href="/login" size="lg" className="w-full">
            Se connecter
          </Button>
          <Button href="/register" variant="outline" size="lg" className="w-full">
            Créer un compte
          </Button>
          <Button href="/pricing" variant="ghost" size="lg" className="w-full">
            Voir les tarifs
          </Button>
        </div>
        <p className="mt-8 text-xs text-muted-foreground">
          <a className="underline-offset-2 hover:underline" href="/confidentialite">
            Confidentialité
          </a>
          {" · "}
          <a className="underline-offset-2 hover:underline" href="/conditions">
            Conditions
          </a>
        </p>
      </main>
    </div>
  );
}
