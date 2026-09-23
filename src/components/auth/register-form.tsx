"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { signUp } from "@/lib/auth/actions";
import { passwordMismatchMessage } from "@/lib/auth/password-mismatch";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(signUp, { error: null });
  const [mismatch, setMismatch] = useState<string | null>(null);
  const values = state.values ?? {};

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        const message = passwordMismatchMessage(event.currentTarget);
        if (message) {
          event.preventDefault();
          setMismatch(message);
          return;
        }
        setMismatch(null);
      }}
    >
      <Input
        id="fullName"
        name="fullName"
        type="text"
        label="Nom complet"
        autoComplete="name"
        required
        placeholder="Aminata Diop"
        defaultValue={values.fullName ?? ""}
        error={state.fieldErrors?.fullName}
      />
      <Input
        id="phone"
        name="phone"
        type="tel"
        label="Numéro de téléphone"
        autoComplete="tel"
        inputMode="tel"
        required
        placeholder="+221 77 000 00 00"
        defaultValue={values.phone ?? ""}
        error={state.fieldErrors?.phone}
      />
      <Input
        id="email"
        name="email"
        type="email"
        label="Adresse e-mail"
        autoComplete="email"
        inputMode="email"
        required
        placeholder="vous@exemple.sn"
        defaultValue={values.email ?? state.email ?? ""}
        error={state.fieldErrors?.email}
      />
      <PasswordInput
        id="password"
        name="password"
        label="Mot de passe"
        autoComplete="new-password"
        required
        minLength={8}
        placeholder="Au moins 8 caractères"
        error={state.fieldErrors?.password}
      />
      <PasswordInput
        id="confirmPassword"
        name="confirmPassword"
        label="Confirmation du mot de passe"
        autoComplete="new-password"
        required
        minLength={8}
        placeholder="Répétez le mot de passe"
        error={mismatch ?? state.fieldErrors?.confirmPassword}
      />
      {state.error && !mismatch ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success && state.message ? (
        <p role="status" className="text-sm text-success">
          {state.message}
        </p>
      ) : null}
      <Button type="submit" size="lg" loading={pending} disabled={state.success} className="w-full">
        {pending ? "Création du compte..." : "Créer mon compte"}
      </Button>
    </form>
  );
}
