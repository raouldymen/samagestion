"use client";

import { useActionState, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { mapAuthError } from "@/lib/auth/errors";
import { isNativeApp } from "@/lib/auth/native";
import { signIn } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/client";

function subscribe() {
  return () => undefined;
}

export function LoginForm({ next = "" }: { next?: string }) {
  const [state, formAction, pending] = useActionState(signIn, { error: null });
  const nativeApp = useSyncExternalStore(subscribe, isNativeApp, () => false);
  const [nativeError, setNativeError] = useState<string | null>(null);
  const [nativePending, setNativePending] = useState(false);

  const nativeSignIn = async (formData: FormData) => {
    setNativeError(null);
    setNativePending(true);

    try {
      const { error } = await createClient().auth.signInWithPassword({
        email: String(formData.get("email") ?? "").trim(),
        password: String(formData.get("password") ?? ""),
      });

      if (error) {
        setNativeError(mapAuthError(error));
        return;
      }

      window.location.assign(next || "/dashboard");
    } catch (error) {
      setNativeError(mapAuthError(error));
    } finally {
      setNativePending(false);
    }
  };

  const error = nativeApp ? nativeError : state.error;
  const loading = nativeApp ? nativePending : pending;

  return (
    <form action={nativeApp ? nativeSignIn : formAction} className="flex flex-col gap-4">
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
        defaultValue={state.email ?? ""}
        key={state.email ? `email-${state.email}` : "email"}
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
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="lg" loading={loading} className="w-full">
        {loading ? "Connexion..." : "Se connecter"}
      </Button>
    </form>
  );
}
