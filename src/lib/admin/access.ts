import { notFound } from "next/navigation";
import { createServiceClient, isServiceRoleConfigured } from "@/lib/payments/service-client";
import { createClient } from "@/lib/supabase/server";

export async function isUserPlatformAdmin(userId: string) {
  if (!userId || !isServiceRoleConfigured()) {
    return false;
  }

  const admin = createServiceClient();
  const { data, error } = await admin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  return !error && Boolean(data?.user_id);
}

export async function isPlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  return isUserPlatformAdmin(user.id);
}

/** Ne révèle pas l'existence de l'administration aux utilisateurs non autorisés. */
export async function requirePlatformAdmin() {
  if (!(await isPlatformAdmin())) {
    notFound();
  }
}
