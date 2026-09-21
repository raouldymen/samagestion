import type { Metadata } from "next";
import Link from "next/link";
import { AuthDivider, GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { LoginForm } from "@/components/auth/login-form";
import { MobileAppInstall } from "@/components/mobile/mobile-app-install";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { safePostAuthNext } from "@/lib/auth/paths";

export const metadata: Metadata = {
  title: "Connexion",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safePostAuthNext(params.next);
  const oauthFailed = params.error === "oauth";

  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo href="/" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          Bienvenue sur SamaGestion
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Gérez votre activité simplement.
        </p>
      </div>
      {oauthFailed ? (
        <p role="alert" className="mb-4 text-sm text-danger">
          La connexion Google a échoué. Réessayez.
        </p>
      ) : null}
      <div className="mb-4 flex flex-col gap-4">
        <GoogleSignInButton next={next} />
        <AuthDivider />
      </div>
      <LoginForm next={next} />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Vous n&apos;avez pas encore de compte ?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Créer un compte
        </Link>
      </p>
      <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
        En vous connectant, vous acceptez nos{" "}
        <Link
          href="/conditions"
          className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Conditions d&apos;utilisation
        </Link>{" "}
        et notre{" "}
        <Link
          href="/confidentialite"
          className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Politique de confidentialité
        </Link>
        .
      </p>
      <MobileAppInstall />
    </Card>
  );
}
