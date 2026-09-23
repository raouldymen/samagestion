"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/ui/password-input";
import { passwordMismatchMessage } from "@/lib/auth/password-mismatch";
import { updatePasswordAction } from "@/lib/settings/actions";

export function SecuritySettings() {
  const [state, action, pending] = useActionState(updatePasswordAction, { error: null });
  const [mismatch, setMismatch] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mot de passe</CardTitle>
      </CardHeader>
      <form
        action={action}
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
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          label="Ancien mot de passe"
          autoComplete="current-password"
          error={state.fieldErrors?.currentPassword}
        />
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
          error={mismatch ?? state.fieldErrors?.confirmPassword}
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
