"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { updatePasswordAction } from "@/lib/settings/actions";

export function SecuritySettings() {
  const [state, action, pending] = useActionState(updatePasswordAction, { error: null });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mot de passe</CardTitle>
      </CardHeader>
      <form action={action} className="flex flex-col gap-4">
        <PasswordInput
          id="password"
          name="password"
          label="Nouveau mot de passe"
          autoComplete="new-password"
          error={state.fieldErrors?.password}
        />
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          label="Confirmer le mot de passe"
          autoComplete="new-password"
          error={state.fieldErrors?.confirmPassword}
        />
        {state.error ? (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        ) : null}
        {state.message ? <p className="text-sm text-success">{state.message}</p> : null}
        <Button type="submit" loading={pending} className="self-start">
          Mettre à jour
        </Button>
      </form>
    </Card>
  );
}
