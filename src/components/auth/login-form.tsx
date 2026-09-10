"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { signIn } from "@/lib/auth/actions";

export function LoginForm({ next = "" }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signIn, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Input
        id="email"
        name="email"
        type="email"
        label="Adresse e-mail"
        autoComplete="email"
        inputMode="email"
        required
        placeholder="vous@exemple.sn"
        error={state.fieldErrors?.email}
      />
      <PasswordInput
        id="password"
        name="password"
        label="Mot de passe"
        autoComplete="current-password"
        required
        placeholder="Votre mot de passe"
        error={state.fieldErrors?.password}
      />
      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="rounded text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Mot de passe oublié ?
        </Link>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="lg" loading={pending} className="w-full">
        {pending ? "Connexion..." : "Se connecter"}
      </Button>
    </form>
  );
}
