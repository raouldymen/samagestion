import { isAssignableRole } from "@/lib/auth/permissions";
import { isValidEmail, readString } from "@/lib/auth/validation";
import type { FieldErrors } from "@/types";

export function validateInvitationForm(formData: FormData) {
  const email = readString(formData, "email").toLowerCase();
  const role = readString(formData, "role");
  const fieldErrors: FieldErrors = {};

  if (!email) {
    fieldErrors.email = "L'adresse e-mail est obligatoire.";
  } else if (!isValidEmail(email)) {
    fieldErrors.email = "Veuillez saisir une adresse e-mail valide.";
  }

  if (!role) {
    fieldErrors.role = "Le rôle est obligatoire.";
  } else if (!isAssignableRole(role)) {
    fieldErrors.role = "Ce rôle n'est pas disponible.";
  }

  return {
    values: { email, role },
    fieldErrors,
    error: Object.keys(fieldErrors).length ? "Veuillez corriger les champs indiqués." : null,
  };
}
