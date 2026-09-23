"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { mapAuthError } from "@/lib/auth/errors";
import { safePostAuthNext } from "@/lib/auth/paths";
import { getFirstMembership, getPostAuthPath, getRequestOrigin } from "@/lib/auth/session";
import { isValidEmail, validateLogin, validateRegister } from "@/lib/auth/validation";
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
  kind: "login" | "signup" | "passwordReset",
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

function submittedEmail(formData: FormData) {
  return String(formData.get("email") ?? "").trim();
}

export async function signIn(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const email = submittedEmail(formData);

  if (!isSupabaseConfigured()) {
    return { error: AUTH_NOT_CONFIGURED, email };
  }

  const limited = await enforceAuthRateLimit("login");
  if (limited) {
    return { ...limited, email };
  }

  const { values, fieldErrors, error } = validateLogin(formData);

  if (error) {
    return { error, fieldErrors, email };
  }

  try {
    const supabase = await createClient();
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (signInError) {
      return { error: mapAuthError(signInError), email };
    }

    const userId = data.user.id;
    const membership = await getFirstMembership(userId);
    const safeNext = safePostAuthNext(String(formData.get("next") ?? ""));

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

    return { error: mapAuthError(caught), email };
  }
}

function submittedRegisterValues(formData: FormData) {
  return {
    fullName: String(formData.get("fullName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: submittedEmail(formData),
  };
}

export async function signUp(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const values = submittedRegisterValues(formData);

  if (!isSupabaseConfigured()) {
    return { error: AUTH_NOT_CONFIGURED, values, email: values.email };
  }

  const limited = await enforceAuthRateLimit("signup");
  if (limited) {
    return { ...limited, values, email: values.email };
  }

  const parsed = validateRegister(formData);

  if (parsed.error) {
    return { error: parsed.error, fieldErrors: parsed.fieldErrors, values, email: values.email };
  }

  try {
    const supabase = await createClient();
    const origin = await getRequestOrigin();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: parsed.values.email,
      password: parsed.values.password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          full_name: parsed.values.fullName,
          phone: parsed.values.phone,
        },
      },
    });

    if (signUpError) {
      return { error: mapAuthError(signUpError), values, email: values.email };
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

    return { error: mapAuthError(caught), values, email: values.email };
  }
}

export async function requestPasswordReset(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { error: AUTH_NOT_CONFIGURED };
  }

  const limited = await enforceAuthRateLimit("passwordReset");
  if (limited) {
    return limited;
  }

  const email = String(formData.get("email") ?? "").trim();

  if (!email || !isValidEmail(email)) {
    return {
      error: "Veuillez saisir une adresse e-mail valide.",
      fieldErrors: { email: email ? "Adresse e-mail invalide." : "L'adresse e-mail est obligatoire." },
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

export async function signInWithGoogle(
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

  try {
    const supabase = await createClient();
    const origin = await getRequestOrigin();
    const safeNext = safePostAuthNext(String(formData.get("next") ?? ""));
    const redirectTo = safeNext
      ? `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`
      : `${origin}/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error || !data.url) {
      return { error: mapAuthError(error ?? new Error("oauth")) };
    }

    redirect(data.url);
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapAuthError(caught) };
  }
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
