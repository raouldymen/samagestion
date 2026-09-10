import { requirePermission } from "@/lib/auth/access";
import { requireBusinessSession } from "@/lib/auth/session";
import {
  DEFAULT_RECEIPT_MESSAGE,
  isReceiptFormat,
  publicLogoUrl,
} from "@/lib/settings/constants";
import { createClient } from "@/lib/supabase/server";
import type { AppLocale } from "@/types/database";
import type { BusinessSettings } from "@/types/settings";

function asLocale(value: string | null | undefined): AppLocale {
  if (value === "fr" || value === "en" || value === "wo") {
    return value;
  }

  return "fr";
}

async function loadBusinessSettings(businessId: string, fallback: {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city?: string | null;
  country?: string | null;
  currency: string;
  logoUrl: string | null;
}): Promise<BusinessSettings> {
  const supabase = await createClient();

  const [{ data: business }, { data: settings }] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, phone, email, address, city, country, currency, logo_url")
      .eq("id", businessId)
      .maybeSingle(),
    supabase.from("business_settings").select("*").eq("business_id", businessId).maybeSingle(),
  ]);

  const rawWidth = settings?.receipt_width ?? "";
  const receiptWidth = isReceiptFormat(rawWidth) ? rawWidth : "80mm";

  return {
    businessId,
    name: business?.name ?? fallback.name,
    phone: business?.phone ?? fallback.phone,
    email: business?.email ?? fallback.email,
    address: business?.address ?? fallback.address,
    city: business?.city ?? fallback.city ?? null,
    country: business?.country ?? fallback.country ?? "Sénégal",
    currency: business?.currency ?? fallback.currency,
    logoPath: business?.logo_url ?? fallback.logoUrl,
    logoUrl: publicLogoUrl(business?.logo_url ?? fallback.logoUrl),
    receiptPrefix: settings?.receipt_prefix ?? "V",
    purchasePrefix: settings?.purchase_prefix ?? "A",
    receiptWidth,
    showLogo: settings?.show_logo ?? true,
    showPhone: settings?.show_phone ?? true,
    showAddress: settings?.show_address ?? true,
    showCustomer: settings?.show_customer ?? true,
    showSeller: settings?.show_seller ?? true,
    showNotes: settings?.show_notes ?? true,
    showMessage: settings?.show_message ?? true,
    receiptMessage: settings?.receipt_message ?? DEFAULT_RECEIPT_MESSAGE,
    legalInformation: settings?.legal_information ?? "",
    timezone: settings?.timezone ?? "Africa/Dakar",
    locale: asLocale(settings?.locale),
    dateFormat: settings?.date_format ?? "short",
    numberFormat: settings?.number_format ?? "fr-FR",
  };
}

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const session = await requirePermission("settings.view");
  return loadBusinessSettings(session.businessId, session.business);
}

/** Lecture des paramètres pour un reçu : autorisée dès que la vente est visible. */
export async function getBusinessSettingsForReceipt(): Promise<BusinessSettings> {
  const session = await requireBusinessSession();
  return loadBusinessSettings(session.businessId, session.business);
}

export async function getReceiptSettingsForBusiness() {
  return getBusinessSettingsForReceipt();
}
