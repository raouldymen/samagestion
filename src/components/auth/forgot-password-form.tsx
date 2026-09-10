"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/auth/actions";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, {
    error: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm text-success">
          {state.message ?? "Si un compte existe, un lien de réinitialisation vous sera envoyé."}
        </p>
      ) : null}
      <Button type="submit" size="lg" loading={pending} className="w-full">
        {pending ? "Envoi du lien..." : "Envoyer le lien"}
      </Button>
    </form>
  );
}
