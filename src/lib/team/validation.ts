import { isAssignableRole } from "@/lib/auth/permissions";
import { isValidEmail, readString } from "@/lib/auth/validation";
import type { FieldErrors } from "@/types";

export function validateInvitationForm(formData: FormData) {
  const email = readString(formData, "email").toLowerCase();
  const role = readString(formData, "role");
  const fullName = readString(formData, "fullName");
  const password = readString(formData, "password");
  const confirmPassword = readString(formData, "confirmPassword");
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

  if (!password) {
    fieldErrors.password = "Le mot de passe est obligatoire.";
  } else if (password.length < 8) {
    fieldErrors.password = "Le mot de passe doit contenir au moins 8 caractères.";
  }

  if (!confirmPassword) {
    fieldErrors.confirmPassword = "Veuillez confirmer le mot de passe.";
  } else if (password !== confirmPassword) {
    fieldErrors.confirmPassword = "Les mots de passe ne correspondent pas.";
  }

  return {
    values: { email, role, fullName, password, confirmPassword },
    fieldErrors,
    error: Object.keys(fieldErrors).length ? "Veuillez corriger les champs indiqués." : null,
  };
}
