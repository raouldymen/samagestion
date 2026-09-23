"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/admin/access";
import { mapAdminError } from "@/lib/admin/errors";
import { parseAdminPeriodDays, parseAdminPlanSlug, parseAdminTrialDays } from "@/lib/admin/validation";
import { createServiceClient } from "@/lib/payments/service-client";
import { createClient } from "@/lib/supabase/server";
import type { AuthResult } from "@/types";

function revalidateAdmin() {
  revalidatePath("/admin/payments");
  revalidatePath("/settings/subscription");
  revalidatePath("/settings/billing");
  revalidatePath("/upgrade");
  revalidatePath("/dashboard");
}

async function adminUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function adminSetBusinessPlanAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const businessId = String(formData.get("businessId") ?? "").trim();
  const plan = parseAdminPlanSlug(String(formData.get("plan") ?? ""));
  const periodDays = plan ? parseAdminPeriodDays(String(formData.get("periodDays") ?? "30"), plan) : null;

  if (!businessId || !plan || periodDays == null) {
    return { error: "Choisissez un commerce, une formule et une durée valides." };
  }

  try {
    await requirePlatformAdmin();
    const supabase = await createClient();
    const adminId = await adminUserId();
    let { error } = await supabase.rpc("admin_set_business_plan", {
      p_business_id: businessId,
      p_plan_slug: plan,
      p_period_days: periodDays,
      p_admin_user_id: adminId,
    });

    if (error) {
      const service = createServiceClient();
      const retry = await service.rpc("admin_set_business_plan", {
        p_business_id: businessId,
        p_plan_slug: plan,
        p_period_days: periodDays,
        p_admin_user_id: adminId,
      });
      error = retry.error;
    }

    if (error) {
      return { error: mapAdminError(error) };
    }

    revalidateAdmin();
    return { error: null, success: true, message: "Formule mise à jour." };
  } catch (caught) {
    return { error: mapAdminError(caught) };
  }
}

export async function adminExtendTrialAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const businessId = String(formData.get("businessId") ?? "").trim();
  const extraDays = parseAdminTrialDays(String(formData.get("extraDays") ?? ""));

  if (!businessId || extraDays == null) {
    return { error: "Choisissez un commerce et une durée d'essai valides." };
  }

  try {
    await requirePlatformAdmin();
    const supabase = await createClient();
    const adminId = await adminUserId();
    let { error } = await supabase.rpc("admin_extend_business_trial", {
      p_business_id: businessId,
      p_extra_days: extraDays,
      p_admin_user_id: adminId,
    });

    if (error) {
      const service = createServiceClient();
      const retry = await service.rpc("admin_extend_business_trial", {
        p_business_id: businessId,
        p_extra_days: extraDays,
        p_admin_user_id: adminId,
      });
      error = retry.error;
    }

    if (error) {
      return { error: mapAdminError(error) };
    }

    revalidateAdmin();
    return { error: null, success: true, message: "Essai prolongé." };
  } catch (caught) {
    return { error: mapAdminError(caught) };
  }
}
