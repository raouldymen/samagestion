import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function isPlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data, error } = await supabase.rpc("is_platform_admin");
  return !error && data === true;
}

/** Ne révèle pas l'existence de l'administration aux utilisateurs non autorisés. */
export async function requirePlatformAdmin() {
  if (!(await isPlatformAdmin())) {
    notFound();
  }
}
