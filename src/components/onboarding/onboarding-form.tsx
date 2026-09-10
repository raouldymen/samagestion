"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBusiness } from "@/lib/business/actions";

export function OnboardingForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createBusiness, {
    error: null,
  });

  useEffect(() => {
    if (!state.success) {
      return;
    }

    const timeout = window.setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 900);

    return () => window.clearTimeout(timeout);
  }, [state.success, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Input
        id="name"
        name="name"
        type="text"
        label="Nom du commerce"
        autoComplete="organization"
        required
        placeholder="Boutique du Marché"
        error={state.fieldErrors?.name}
      />
      <Input
        id="phone"
        name="phone"
        type="tel"
        label="Numéro de téléphone"
        autoComplete="tel"
        inputMode="tel"
        placeholder="+221 77 000 00 00"
        error={state.fieldErrors?.phone}
      />
      <Input
        id="email"
        name="email"
        type="email"
        label="Email"
        autoComplete="email"
        inputMode="email"
        placeholder="commerce@exemple.sn"
        error={state.fieldErrors?.email}
      />
      <Input
        id="address"
        name="address"
        type="text"
        label="Adresse"
        autoComplete="street-address"
        placeholder="Sandaga, Dakar"
        error={state.fieldErrors?.address}
      />
      <p className="text-sm text-muted-foreground">
        Devise : <span className="font-medium text-foreground">XOF (FCFA)</span>
      </p>
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
      <Button
        type="submit"
        size="lg"
        loading={pending}
        disabled={state.success}
        className="w-full"
      >
        {pending
          ? "Création du commerce..."
          : state.success
            ? "Commerce créé avec succès."
            : "Créer mon commerce"}
      </Button>
    </form>
  );
}
