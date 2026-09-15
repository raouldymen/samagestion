import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Membre introuvable",
};

export default function TeamMemberNotFound() {
  return (
    <Card className="py-10 text-center">
      <h1 className="text-xl font-semibold">Membre introuvable</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Ce membre ne fait pas partie de votre commerce.
      </p>
      <Button href="/team" className="mt-4">
        Retour à l&apos;équipe
      </Button>
    </Card>
  );
}
