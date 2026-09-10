"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/access";
import { requireBusinessSession, requireUser } from "@/lib/auth/session";
import { isRedirectError } from "@/lib/products/errors";
import {
  BUSINESS_LOGO_BUCKET,
  BUSINESS_LOGO_MAX_BYTES,
  logoStoragePath,
} from "@/lib/settings/constants";
import { mapSettingsError } from "@/lib/settings/errors";
import {
  validateBusinessProfile,
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
    await requireUser();
    await requireBusinessSession();
    const supabase = await createClient();
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
