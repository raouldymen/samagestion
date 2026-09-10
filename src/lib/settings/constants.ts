import { getSupabasePublicEnv } from "@/lib/env";

export const BUSINESS_LOGO_BUCKET = "business-logos";
export const BUSINESS_LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const BUSINESS_LOGO_MAX_EDGE = 512;

export const RECEIPT_FORMATS = ["58mm", "80mm", "A4"] as const;

export const DEFAULT_RECEIPT_MESSAGE = "Merci pour votre achat !\nÀ bientôt.";

export const SUPPORTED_LOCALES = [
  { value: "fr", label: "Français", enabled: true },
  { value: "wo", label: "Wolof", enabled: false },
  { value: "en", label: "Anglais", enabled: false },
] as const;

export function logoStoragePath(value: string | null) {
  if (!value) {
    return null;
  }

  const marker = `/${BUSINESS_LOGO_BUCKET}/`;
  const index = value.indexOf(marker);

  if (index >= 0) {
    return value.slice(index + marker.length);
  }

  return value;
}

export function publicLogoUrl(path: string | null) {
  if (!path) {
    return null;
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const env = getSupabasePublicEnv();

  if (!env) {
    return null;
  }

  return `${env.url}/storage/v1/object/public/${BUSINESS_LOGO_BUCKET}/${path}`;
}

export function displayCurrency(code: string) {
  return code === "XOF" ? "FCFA" : code;
}

export function formatDocumentNumber(prefix: string, sequence: number) {
  return `${prefix}-${String(sequence).padStart(6, "0")}`;
}

export function sanitizeDocumentPrefix(value: string) {
  const prefix = value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
  return prefix.length > 0 ? prefix : null;
}

export function isReceiptFormat(value: string): value is (typeof RECEIPT_FORMATS)[number] {
  return RECEIPT_FORMATS.includes(value as (typeof RECEIPT_FORMATS)[number]);
}
