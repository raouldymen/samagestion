"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/access";
import { requireBusinessSession, requireUser } from "@/lib/auth/session";
import { isRedirectError } from "@/lib/products/errors";
import {
  BUSINESS_LOGO_BUCKET,
  BUSINESS_LOGO_MAX_BYTES,
  logoStoragePath,
} from "@/lib/settings/constants";
import { deleteOrphanedMemberAccounts, memberIdsFromDeleteResult } from "@/lib/settings/delete-members";
import { mapSettingsError } from "@/lib/settings/errors";
import {
  validateBusinessProfile,
  validateDeleteBusinessForm,
  validatePasswordChange,
  validatePreferencesForm,
  validateReceiptSettingsForm,
} from "@/lib/settings/validation";
import { createClient } from "@/lib/supabase/server";
import type { AuthResult } from "@/types";

function revalidateSettings() {
  revalidatePath("/settings");
  revalidatePath("/settings/business");
  revalidatePath("/settings/receipts");
  revalidatePath("/settings/preferences");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");
}

export async function updateBusinessProfileAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const { values, fieldErrors, error } = validateBusinessProfile(formData);

  if (error) {
    return { error, fieldErrors };
  }

  try {
    await requirePermission("settings.edit");
    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc("update_business_profile", {
      p_name: values.name,
      p_phone: values.phone || null,
      p_email: values.email || null,
      p_address: values.address || null,
      p_city: values.city || null,
      p_country: values.country || "Sénégal",
    });

    if (rpcError) {
      return { error: mapSettingsError(rpcError), fieldErrors };
    }

    revalidateSettings();
    return { error: null, success: true, message: "Informations du commerce enregistrées." };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapSettingsError(caught) };
  }
}

export async function uploadBusinessLogoAction(formData: FormData): Promise<AuthResult> {
  const file = formData.get("logo");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choisissez une image PNG, JPG ou WebP." };
  }

  if (file.size > BUSINESS_LOGO_MAX_BYTES) {
    return { error: "Le logo ne doit pas dépasser 2 Mo." };
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { error: "Seuls les fichiers JPG, PNG et WebP sont acceptés." };
  }

  try {
    const session = await requirePermission("settings.edit");
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${session.businessId}/logo.${extension}`;
    const supabase = await createClient();
    const { error: uploadError } = await supabase.storage.from(BUSINESS_LOGO_BUCKET).upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

    if (uploadError) {
      return { error: mapSettingsError(uploadError) };
    }

    const { error: rpcError } = await supabase.rpc("set_business_logo", {
      p_logo_url: path,
    });

    if (rpcError) {
      return { error: mapSettingsError(rpcError) };
    }

    revalidateSettings();
    return { error: null, success: true, message: "Logo enregistré." };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapSettingsError(caught) };
  }
}

export async function removeBusinessLogoAction(): Promise<AuthResult> {
  try {
    const session = await requirePermission("settings.edit");
    const supabase = await createClient();

    const path = logoStoragePath(session.business.logoUrl);

    if (path) {
      await supabase.storage.from(BUSINESS_LOGO_BUCKET).remove([path]);
    }

    const { error } = await supabase.rpc("set_business_logo", { p_logo_url: null });

    if (error) {
      return { error: mapSettingsError(error) };
    }

    revalidateSettings();
    return { error: null, success: true, message: "Logo retiré." };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapSettingsError(caught) };
  }
}

export async function updateReceiptSettingsAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const { values, fieldErrors, error } = validateReceiptSettingsForm(formData);

  if (error) {
    return { error, fieldErrors };
  }

  try {
    await requirePermission("settings.edit");
    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc("update_receipt_settings", {
      p_receipt_prefix: values.receiptPrefix,
      p_purchase_prefix: values.purchasePrefix,
      p_receipt_width: values.receiptWidth,
      p_show_logo: values.showLogo,
      p_show_phone: values.showPhone,
      p_show_address: values.showAddress,
      p_show_customer: values.showCustomer,
      p_show_seller: values.showSeller,
      p_show_notes: values.showNotes,
      p_show_message: values.showMessage,
      p_receipt_message: values.receiptMessage,
      p_legal_information: values.legalInformation || null,
    });

    if (rpcError) {
      return { error: mapSettingsError(rpcError), fieldErrors };
    }

    revalidateSettings();
    return { error: null, success: true, message: "Paramètres du reçu enregistrés." };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapSettingsError(caught) };
  }
}

export async function updatePreferencesAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const { values, fieldErrors, error } = validatePreferencesForm(formData);

  if (error) {
    return { error, fieldErrors };
  }

  try {
    await requirePermission("settings.edit");
    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc("update_business_preferences", {
      p_locale: values.locale,
      p_date_format: values.dateFormat,
      p_number_format: values.numberFormat,
    });

    if (rpcError) {
      return { error: mapSettingsError(rpcError), fieldErrors };
    }

    revalidateSettings();
    return { error: null, success: true, message: "Préférences enregistrées." };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapSettingsError(caught) };
  }
}

export async function updatePasswordAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const { values, fieldErrors, error } = validatePasswordChange(formData);

  if (error) {
    return { error, fieldErrors };
  }

  try {
    const user = await requireUser();
    await requireBusinessSession();
    if (!user.email) {
      return { error: "Impossible de vérifier votre ancien mot de passe. Utilisez la réinitialisation du mot de passe.", fieldErrors };
    }

    const supabase = await createClient();
    const { error: verificationError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: values.currentPassword,
    });

    if (verificationError) {
      return { error: "L'ancien mot de passe est incorrect.", fieldErrors };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: values.password,
    });

    if (updateError) {
      return { error: mapSettingsError(updateError), fieldErrors };
    }

    return { error: null, success: true, message: "Mot de passe mis à jour." };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapSettingsError(caught) };
  }
}

export async function deleteBusinessAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const { values, fieldErrors, error } = validateDeleteBusinessForm(formData);

  if (error) {
    return { error, fieldErrors };
  }

  try {
    const user = await requireUser();
    const session = await requireBusinessSession();

    if (session.role !== "owner" || (session.business.ownerId && session.business.ownerId !== session.user.id)) {
      return { error: "Seul le propriétaire peut supprimer le commerce." };
    }

    if (!user.email) {
      return { error: "Impossible de vérifier le mot de passe. Définissez-en un dans Sécurité." };
    }

    const supabase = await createClient();
    const { error: verificationError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: values.password,
    });

    if (verificationError) {
      return { error: "Le mot de passe est incorrect.", fieldErrors: { password: "Le mot de passe est incorrect." } };
    }

    const logoPath = logoStoragePath(session.business.logoUrl);
    const { data: members } = await supabase
      .from("business_members")
      .select("user_id")
      .eq("business_id", session.businessId);
    const { data, error: rpcError } = await supabase.rpc("delete_own_business");

    if (rpcError) {
      return { error: mapSettingsError(rpcError) };
    }

    const memberIds = [
      ...memberIdsFromDeleteResult(data),
      ...(members ?? []).map((row) => row.user_id),
    ];
    await deleteOrphanedMemberAccounts(memberIds);

    if (logoPath) {
      await supabase.storage.from(BUSINESS_LOGO_BUCKET).remove([logoPath]);
    }

    revalidateSettings();
    try {
      await supabase.auth.signOut();
    } catch {
      // Le compte propriétaire a pu être déjà supprimé.
    }
    redirect("/login");
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapSettingsError(caught) };
  }
}
