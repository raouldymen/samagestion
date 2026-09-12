import type { Metadata } from "next";
import Link from "next/link";
import { AuthDivider, GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { RegisterForm } from "@/components/auth/register-form";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "Inscription",
};

export default function RegisterPage() {
  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo href="/" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-foreground">
          Créer un compte
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Commencez à gérer votre activité en quelques minutes.
        </p>
      </div>
      <div className="mb-4 flex flex-col gap-4">
        <GoogleSignInButton />
        <AuthDivider />
      </div>
      <RegisterForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Vous avez déjà un compte ?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          Se connecter
        </Link>
      </p>
    </Card>
  );
}
