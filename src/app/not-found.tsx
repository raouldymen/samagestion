import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Page introuvable",
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <main className="flex w-full max-w-md flex-col items-center text-center">
        <Logo href="/dashboard" />
        <p className="mt-8 text-sm font-semibold tracking-wide text-primary">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Cette page n&apos;existe pas.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Le lien est peut-être incorrect, ou la page a été déplacée.
        </p>
        <Button href="/dashboard" size="lg" className="mt-8 w-full sm:w-auto">
          Retour au tableau de bord
        </Button>
      </main>
    </div>
  );
}
