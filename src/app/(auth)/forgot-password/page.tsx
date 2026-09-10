import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
};

export default function ForgotPasswordPage() {
  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo href="/" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          Mot de passe oublié ?
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Entrez votre e-mail pour recevoir un lien de réinitialisation.
        </p>
      </div>
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Retour à la connexion
        </Link>
      </p>
    </Card>
  );
}
