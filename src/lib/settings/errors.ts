export function mapSettingsError(error: unknown): string {
  const message = getErrorMessage(error).toLowerCase();

  if (message.includes("business_name_required")) {
    return "Le nom du commerce est obligatoire.";
  }

  if (message.includes("invalid_receipt_prefix")) {
    return "Le préfixe des ventes doit contenir 1 à 8 lettres ou chiffres.";
  }

  if (message.includes("invalid_purchase_prefix")) {
    return "Le préfixe des achats doit contenir 1 à 8 lettres ou chiffres.";
  }

  if (message.includes("invalid_receipt_width")) {
    return "Format de reçu invalide.";
  }

  if (message.includes("invalid_locale")) {
    return "Cette langue n'est pas encore disponible.";
  }

  if (message.includes("forbidden")) {
    return "Vous n'avez pas la permission de modifier ces paramètres.";
  }

  if (
    message.includes("business_delete_failed") ||
    message.includes("owner_protected") ||
    message.includes("foreign key") ||
    message.includes("violates")
  ) {
    return "Le commerce n'a pas pu être supprimé. Réessayez.";
  }

  if (message.includes("not_authenticated") || message.includes("no_business")) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }

  if (message.includes("password")) {
    return "Impossible de mettre à jour le mot de passe. Réessayez.";
  }

  if (message.includes("failed to fetch") || message.includes("network") || message.includes("fetch")) {
    return "Impossible de joindre le serveur. Vérifiez votre connexion internet.";
  }

  return "Une erreur est survenue. Veuillez réessayer.";
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "";
}
