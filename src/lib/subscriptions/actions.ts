"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/access";
import { isRedirectError } from "@/lib/products/errors";
import { mapSubscriptionError } from "@/lib/subscriptions/errors";
import { isPlanSlug } from "@/lib/subscriptions/constants";
import { createClient } from "@/lib/supabase/server";
import type { AuthResult } from "@/types";

function revalidateSubscription() {
  revalidatePath("/settings/subscription");
  revalidatePath("/settings/usage");
  revalidatePath("/settings/billing");
  revalidatePath("/upgrade");
  revalidatePath("/checkout");
  revalidatePath("/pricing");
  revalidatePath("/dashboard");
  revalidatePath("/team");
  revalidatePath("/reports");
}

/** Downgrade Free uniquement — les plans payants passent par /checkout. */
export async function changePlanAction(formData: FormData): Promise<AuthResult> {
  const slug = String(formData.get("plan") ?? "");

  try {
    await requirePermission("settings.edit");
    if (!isPlanSlug(slug) || slug !== "free") {
      return { error: "Utilisez le paiement pour passer à un plan payant." };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("change_business_plan", { p_plan_slug: slug });
    if (error) {
      return { error: mapSubscriptionError(error) };
    }

    revalidateSubscription();
    return { error: null, success: true, message: "Retour au plan Gratuit." };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }
    return { error: mapSubscriptionError(caught) };
  }
}

export async function requestUpgradeCheckoutAction(formData: FormData): Promise<AuthResult> {
  const slug = String(formData.get("plan") ?? "pro");

  try {
    await requirePermission("settings.edit");
    if (!isPlanSlug(slug) || slug === "free") {
      return { error: "Choisissez un plan payant." };
    }
    redirect(`/checkout?plan=${slug}`);
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }
    return { error: mapSubscriptionError(caught) };
  }
}

export async function cancelSubscriptionAction(): Promise<AuthResult> {
  try {
    await requirePermission("settings.edit");
    const supabase = await createClient();
    const { error } = await supabase.rpc("cancel_business_subscription");
    if (error) {
      return { error: mapSubscriptionError(error) };
    }
    revalidateSubscription();
    return {
      error: null,
      success: true,
      message: "Abonnement annulé à la fin de la période en cours.",
    };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }
    return { error: mapSubscriptionError(caught) };
  }
}

export async function reactivateSubscriptionAction(): Promise<AuthResult> {
  try {
    await requirePermission("settings.edit");
    const supabase = await createClient();
    const { error } = await supabase.rpc("reactivate_business_subscription");
    if (error) {
      return { error: mapSubscriptionError(error) };
    }
    revalidateSubscription();
    return { error: null, success: true, message: "Abonnement réactivé." };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }
    return { error: mapSubscriptionError(caught) };
  }
}
