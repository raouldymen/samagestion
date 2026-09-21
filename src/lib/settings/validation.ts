import { isValidEmail, readString } from "@/lib/auth/validation";
import { DEFAULT_RECEIPT_MESSAGE, isReceiptFormat, sanitizeDocumentPrefix } from "@/lib/settings/constants";
import type { FieldErrors } from "@/types";

export function validateBusinessProfile(formData: FormData) {
  const name = readString(formData, "name");
  const phone = readString(formData, "phone");
  const email = readString(formData, "email");
  const address = readString(formData, "address");
  const city = readString(formData, "city");
  const country = readString(formData, "country") || "Sénégal";
  const fieldErrors: FieldErrors = {};

  if (!name) {
    fieldErrors.name = "Le nom du commerce est obligatoire.";
  }

  if (email && !isValidEmail(email)) {
    fieldErrors.email = "Veuillez saisir une adresse e-mail valide.";
  }

  return {
    values: { name, phone, email, address, city, country },
    fieldErrors,
    error: Object.keys(fieldErrors).length ? "Veuillez corriger les champs indiqués." : null,
  };
}

export function validateReceiptSettingsForm(formData: FormData) {
  const receiptPrefix = sanitizeDocumentPrefix(readString(formData, "receiptPrefix"));
  const purchasePrefix = sanitizeDocumentPrefix(readString(formData, "purchasePrefix"));
  const receiptWidth = readString(formData, "receiptWidth");
  const fieldErrors: FieldErrors = {};

  if (!receiptPrefix) {
    fieldErrors.receiptPrefix = "Le préfixe des ventes est obligatoire (lettres ou chiffres).";
  }

  if (!purchasePrefix) {
    fieldErrors.purchasePrefix = "Le préfixe des achats est obligatoire (lettres ou chiffres).";
  }

  if (!isReceiptFormat(receiptWidth)) {
    fieldErrors.receiptWidth = "Choisissez 58 mm, 80 mm ou A4.";
  }

  return {
    values: {
      receiptPrefix: receiptPrefix ?? "V",
      purchasePrefix: purchasePrefix ?? "A",
      receiptWidth: isReceiptFormat(receiptWidth) ? receiptWidth : "80mm",
      showLogo: formData.get("showLogo") === "on",
      showPhone: formData.get("showPhone") === "on",
      showAddress: formData.get("showAddress") === "on",
      showCustomer: formData.get("showCustomer") === "on",
      showSeller: formData.get("showSeller") === "on",
      showNotes: formData.get("showNotes") === "on",
      showMessage: formData.get("showMessage") === "on",
      receiptMessage: readString(formData, "receiptMessage") || DEFAULT_RECEIPT_MESSAGE,
      legalInformation: readString(formData, "legalInformation"),
    },
    fieldErrors,
    error: Object.keys(fieldErrors).length ? "Veuillez corriger les champs indiqués." : null,
  };
}

export function validatePreferencesForm(formData: FormData) {
  const locale = readString(formData, "locale") || "fr";
  const dateFormat = readString(formData, "dateFormat") || "short";
  const numberFormat = readString(formData, "numberFormat") || "fr-FR";
  const fieldErrors: FieldErrors = {};

  if (locale !== "fr" && locale !== "en" && locale !== "wo") {
    fieldErrors.locale = "Langue invalide.";
  } else if (locale !== "fr") {
    fieldErrors.locale = "Seule la langue française est disponible pour le moment.";
  }

  if (dateFormat !== "short" && dateFormat !== "long") {
    fieldErrors.dateFormat = "Format de date invalide.";
  }

  if (numberFormat !== "fr-FR") {
    fieldErrors.numberFormat = "Format de nombre invalide.";
  }

  return {
    values: {
      locale: "fr" as const,
      dateFormat: dateFormat === "long" ? "long" : "short",
      numberFormat: "fr-FR" as const,
    },
    fieldErrors,
    error: Object.keys(fieldErrors).length ? "Veuillez corriger les champs indiqués." : null,
  };
}

export function validatePasswordChange(formData: FormData) {
  const currentPassword = readString(formData, "currentPassword");
  const password = readString(formData, "password");
  const confirmPassword = readString(formData, "confirmPassword");
  const fieldErrors: FieldErrors = {};

  if (!currentPassword) {
    fieldErrors.currentPassword = "Saisissez votre ancien mot de passe.";
  }

  if (!password) {
    fieldErrors.password = "Le mot de passe est obligatoire.";
  } else if (password.length < 8) {
    fieldErrors.password = "Le mot de passe doit contenir au moins 8 caractères.";
  }

  if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "Les mots de passe ne correspondent pas.";
  }

  return {
    values: { currentPassword, password },
    fieldErrors,
    error: Object.keys(fieldErrors).length ? "Veuillez corriger les champs indiqués." : null,
  };
}
