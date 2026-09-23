"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/admin/access";
import { mapAdminError } from "@/lib/admin/errors";
import { parseAdminPeriodDays, parseAdminPlanSlug, parseAdminTrialDays } from "@/lib/admin/validation";
import { createServiceClient } from "@/lib/payments/service-client";
import { formatDate } from "@/lib/utils/format";
import type { AuthResult } from "@/types";

const CURRENT_STATUSES = ["trialing", "active", "past_due", "cancelled"] as const;

function revalidateAdmin() {
  revalidatePath("/admin/payments");
  revalidatePath("/settings/subscription");
  revalidatePath("/settings/billing");
  revalidatePath("/upgrade");
  revalidatePath("/dashboard");
}

function periodEndFromDays(days: number) {
  return new Date(Date.now() + days * 86_400_000).toISOString();
}

async function currentSubscriptionId(businessId: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from("business_subscriptions")
    .select("id, status, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const current = (data ?? []).find((row) => CURRENT_STATUSES.includes(row.status as (typeof CURRENT_STATUSES)[number]));
  return current?.id ?? data?.[0]?.id ?? null;
}

async function planIdBySlug(slug: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from("subscription_plans")
    .select("id, slug, name")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("PLAN_NOT_FOUND");
  }

  return data;
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
    const service = createServiceClient();
    const planRow = await planIdBySlug(plan);
    const subscriptionId = await currentSubscriptionId(businessId);
    const now = new Date().toISOString();
    const periodEnd = plan === "free" ? null : periodEndFromDays(periodDays);

    const payload = {
      plan_id: planRow.id,
      status: "active" as const,
      current_period_start: now,
      current_period_end: periodEnd,
      trial_start: null,
      trial_end: null,
      cancel_at_period_end: false,
      cancelled_at: null,
    };

    const { error } = subscriptionId
      ? await service.from("business_subscriptions").update(payload).eq("id", subscriptionId)
      : await service.from("business_subscriptions").insert({
          business_id: businessId,
          started_at: now,
          ...payload,
        });

    if (error) {
      return { error: mapAdminError(error) };
    }

    revalidateAdmin();
    const planLabel = plan === "free" ? "Gratuit" : plan === "pro" ? "Pro" : "Business";
    return {
      error: null,
      success: true,
      message:
        plan === "free"
          ? "Formule Gratuit enregistrée."
          : `Formule ${planLabel} enregistrée pour ${periodDays} jours, jusqu’au ${formatDate(periodEnd!)}.`,
    };
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
    const service = createServiceClient();
    const businessPlan = await planIdBySlug("business");

    const { data: current } = await service
      .from("business_subscriptions")
      .select("id, plan_id, status, trial_end, current_period_end")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    const row =
      (current ?? []).find((item) => CURRENT_STATUSES.includes(item.status as (typeof CURRENT_STATUSES)[number])) ??
      current?.[0] ??
      null;

    const from = row?.trial_end ?? row?.current_period_end ?? new Date().toISOString();
    const base = new Date(from).getTime() > Date.now() ? new Date(from) : new Date();
    const trialEnd = new Date(base.getTime() + extraDays * 86_400_000).toISOString();
    const now = new Date().toISOString();

    const { data: currentPlan } = row
      ? await service.from("subscription_plans").select("slug").eq("id", row.plan_id).maybeSingle()
      : { data: null };

    const planId = currentPlan?.slug === "free" || !row ? businessPlan.id : row.plan_id;

    const { error } = row
      ? await service
          .from("business_subscriptions")
          .update({
            plan_id: planId,
            status: "trialing",
            trial_start: now,
            trial_end: trialEnd,
            current_period_start: now,
            current_period_end: trialEnd,
            cancel_at_period_end: false,
            cancelled_at: null,
          })
          .eq("id", row.id)
      : await service.from("business_subscriptions").insert({
          business_id: businessId,
          plan_id: planId,
          status: "trialing",
          started_at: now,
          trial_start: now,
          trial_end: trialEnd,
          current_period_start: now,
          current_period_end: trialEnd,
          cancel_at_period_end: false,
        });

    if (error) {
      return { error: mapAdminError(error) };
    }

    revalidateAdmin();
    return {
      error: null,
      success: true,
      message: `Essai prolongé de ${extraDays} jours, jusqu’au ${formatDate(trialEnd)}.`,
    };
  } catch (caught) {
    return { error: mapAdminError(caught) };
  }
}
