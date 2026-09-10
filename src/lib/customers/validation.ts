import { isValidEmail } from "@/lib/auth/validation";
import type { FieldErrors } from "@/types";

const MAX_NAME = 120;
const MAX_PHONE = 30;
const MAX_EMAIL = 120;
const MAX_ADDRESS = 250;
const MAX_NOTES = 500;

export function validateCustomerForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const isActiveRaw = formData.get("isActive");
  const isActive = isActiveRaw == null ? true : String(isActiveRaw) !== "false";
  const fieldErrors: FieldErrors = {};

  if (!name) {
    fieldErrors.name = "Le nom du client est obligatoire.";
  } else if (name.length > MAX_NAME) {
    fieldErrors.name = `Le nom ne peut pas dépasser ${MAX_NAME} caractères.`;
  }

  if (phone.length > MAX_PHONE) {
    fieldErrors.phone = `Le téléphone ne peut pas dépasser ${MAX_PHONE} caractères.`;
  }

  if (email) {
    if (!isValidEmail(email)) {
      fieldErrors.email = "Adresse e-mail invalide.";
    } else if (email.length > MAX_EMAIL) {
      fieldErrors.email = `L'e-mail ne peut pas dépasser ${MAX_EMAIL} caractères.`;
    }
  }

  if (address.length > MAX_ADDRESS) {
    fieldErrors.address = `L'adresse ne peut pas dépasser ${MAX_ADDRESS} caractères.`;
  }

  if (notes.length > MAX_NOTES) {
    fieldErrors.notes = `Les notes ne peuvent pas dépasser ${MAX_NOTES} caractères.`;
  }

  return {
    values: { name, phone, email, address, notes, isActive },
    fieldErrors,
    error: Object.keys(fieldErrors).length ? "Veuillez corriger les champs indiqués." : null,
  };
}
