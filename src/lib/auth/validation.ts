import type { FieldErrors } from "@/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function isValidEmail(email: string) {
  return EMAIL_REGEX.test(email);
}

export function validateRegister(formData: FormData) {
  const fullName = readString(formData, "fullName");
  const phone = readString(formData, "phone");
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  const confirmPassword = readString(formData, "confirmPassword");
  const fieldErrors: FieldErrors = {};

  if (!fullName) {
    fieldErrors.fullName = "Le nom complet est obligatoire.";
  }

  if (!phone) {
    fieldErrors.phone = "Le numéro de téléphone est obligatoire.";
  }

  if (!email) {
    fieldErrors.email = "L'adresse e-mail est obligatoire.";
  } else if (!isValidEmail(email)) {
    fieldErrors.email = "Veuillez saisir une adresse e-mail valide.";
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
    values: { fullName, phone, email, password, confirmPassword },
    fieldErrors,
    error: Object.keys(fieldErrors).length
      ? "Veuillez corriger les champs indiqués."
      : null,
  };
}

export function validateLogin(formData: FormData) {
  const email = readString(formData, "email");
  const password = readString(formData, "password");
  const fieldErrors: FieldErrors = {};

  if (!email) {
    fieldErrors.email = "L'adresse e-mail est obligatoire.";
  } else if (!isValidEmail(email)) {
    fieldErrors.email = "Veuillez saisir une adresse e-mail valide.";
  }

  if (!password) {
    fieldErrors.password = "Le mot de passe est obligatoire.";
  }

  return {
    values: { email, password },
    fieldErrors,
    error: Object.keys(fieldErrors).length
      ? "Veuillez corriger les champs indiqués."
      : null,
  };
}

export function validateBusiness(formData: FormData) {
  const name = readString(formData, "name");
  const phone = readString(formData, "phone");
  const email = readString(formData, "email");
  const address = readString(formData, "address");
  const fieldErrors: FieldErrors = {};

  if (!name) {
    fieldErrors.name = "Le nom du commerce est obligatoire.";
  }

  if (email && !isValidEmail(email)) {
    fieldErrors.email = "Veuillez saisir une adresse e-mail valide.";
  }

  return {
    values: { name, phone, email, address },
    fieldErrors,
    error: Object.keys(fieldErrors).length
      ? "Veuillez corriger les champs indiqués."
      : null,
  };
}
