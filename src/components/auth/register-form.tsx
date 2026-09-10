"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { signUp } from "@/lib/auth/actions";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(signUp, { error: null });

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        id="fullName"
        name="fullName"
        type="text"
        label="Nom complet"
        autoComplete="name"
        required
        placeholder="Aminata Diop"
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
        error={state.fieldErrors?.confirmPassword}
      />
      {state.error ? (
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
