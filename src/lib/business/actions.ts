"use server";

import { revalidatePath } from "next/cache";
import { mapAuthError } from "@/lib/auth/errors";
import { requireUser } from "@/lib/auth/session";
import { validateBusiness } from "@/lib/auth/validation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { AuthResult } from "@/types";

const AUTH_NOT_CONFIGURED =
  "L'authentification n'est pas encore configurée. Ajoutez vos clés Supabase dans .env.local.";

export async function createBusiness(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { error: AUTH_NOT_CONFIGURED };
  }

  const { values, fieldErrors, error } = validateBusiness(formData);

  if (error) {
    return { error, fieldErrors };
  }

  try {
    await requireUser();
    const supabase = await createClient();

    const { error: rpcError } = await supabase.rpc("create_business", {
      p_name: values.name,
      p_phone: values.phone || null,
      p_email: values.email || null,
      p_address: values.address || null,
    });

    if (rpcError) {
      return { error: mapAuthError(rpcError) };
    }

    revalidatePath("/dashboard");
    revalidatePath("/onboarding");

    return {
      error: null,
      success: true,
      message:
        "Bienvenue sur SamaGestion 👋 Votre plan Gratuit est actif. Vous pouvez commencer immédiatement.",
    };
  } catch (caught) {
    if (
      typeof caught === "object" &&
      caught !== null &&
      "digest" in caught &&
      typeof caught.digest === "string" &&
      caught.digest.startsWith("NEXT_REDIRECT")
    ) {
      throw caught;
    }

    return { error: mapAuthError(caught) };
  }
}
