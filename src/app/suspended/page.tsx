import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { signOut } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Accès suspendu",
};

export const dynamic = "force-dynamic";

export default async function SuspendedPage() {
  await requireUser();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md p-6 text-center">
        <div className="mb-6 flex justify-center">
          <Logo href="/" />
        </div>
        <h1 className="text-xl font-semibold">Accès suspendu</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre accès à ce commerce a été suspendu. Contactez le propriétaire pour le réactiver.
        </p>
        <form action={signOut} className="mt-6">
          <Button type="submit" variant="outline" className="w-full">
            Se déconnecter
          </Button>
        </form>
      </Card>
    </div>
  );
}
