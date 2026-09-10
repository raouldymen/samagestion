"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { mapAuthError } from "@/lib/auth/errors";
import { getFirstMembership, getPostAuthPath, getRequestOrigin } from "@/lib/auth/session";
import { validateLogin, validateRegister } from "@/lib/auth/validation";
import { isSupabaseConfigured } from "@/lib/env";
import {
  RATE_LIMITS,
  checkRateLimit,
  clientIpFromHeaders,
} from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { AuthResult } from "@/types";

const AUTH_NOT_CONFIGURED =
  "L'authentification n'est pas encore configurée. Ajoutez vos clés Supabase dans .env.local.";

async function enforceAuthRateLimit(
  kind: "login" | "signup",
): Promise<AuthResult | null> {
  const h = await headers();
  const ip = clientIpFromHeaders(h);
  const cfg = RATE_LIMITS[kind];
  const result = checkRateLimit({
    key: `${kind}:${ip}`,
    windowMs: cfg.windowMs,
    max: cfg.max,
  });
  if (!result.allowed) {
    return {
      error: `Trop de tentatives. Réessayez dans ${result.retryAfterSec}s.`,
    };
  }
  return null;
}

export async function signIn(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { error: AUTH_NOT_CONFIGURED };
  }

  const limited = await enforceAuthRateLimit("login");
  if (limited) {
    return limited;
  }

  const { values, fieldErrors, error } = validateLogin(formData);

  if (error) {
    return { error, fieldErrors };
  }

  try {
    const supabase = await createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (signInError) {
      return { error: mapAuthError(signInError) };
    }

    const userId = data.user.id;
    const membership = await getFirstMembership(supabase, userId);
    const next = String(formData.get("next") ?? "");
    const safeNext = next.startsWith("/invitations/") ? next : "";

    if (membership?.kind === "suspended") {
      redirect("/suspended");
    }

    if (safeNext) {
      redirect(safeNext);
    }

    redirect(await getPostAuthPath(supabase, userId, membership));
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapAuthError(caught) };
  }
}

export async function signUp(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { error: AUTH_NOT_CONFIGURED };
  }

  const limited = await enforceAuthRateLimit("signup");
  if (limited) {
    return limited;
  }

  const { values, fieldErrors, error } = validateRegister(formData);

  if (error) {
    return { error, fieldErrors };
  }

  try {
    const supabase = await createClient();
    const origin = await getRequestOrigin();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          full_name: values.fullName,
          phone: values.phone,
        },
      },
    });

    if (signUpError) {
      return { error: mapAuthError(signUpError) };
    }

    if (data.session) {
      redirect("/onboarding");
    }

    return {
      error: null,
      success: true,
      message:
        "Compte créé. Vérifiez votre e-mail pour confirmer votre adresse, puis connectez-vous.",
    };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapAuthError(caught) };
  }
}

export async function requestPasswordReset(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { error: AUTH_NOT_CONFIGURED };
  }

  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return {
      error: "Veuillez renseigner votre adresse e-mail.",
      fieldErrors: { email: "L'adresse e-mail est obligatoire." },
    };
  }

  try {
    const supabase = await createClient();
    const origin = await getRequestOrigin();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback`,
    });

    if (error) {
      return { error: mapAuthError(error) };
    }

    return {
      error: null,
      success: true,
      message: "Si un compte existe, un lien de réinitialisation vous sera envoyé.",
    };
  } catch (caught) {
    return { error: mapAuthError(caught) };
  }
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/login");
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}
