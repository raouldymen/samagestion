export function mapExpenseError(error: unknown): string {
  const message = getErrorMessage(error).toLowerCase();

  if (message.includes("description_required")) {
    return "La description est obligatoire.";
  }

  if (message.includes("invalid_amount")) {
    return "Le montant doit être supérieur à 0.";
  }

  if (message.includes("date_required")) {
    return "La date est obligatoire.";
  }

  if (message.includes("invalid_payment_method")) {
    return "Mode de paiement invalide.";
  }

  if (message.includes("invalid_category")) {
    return "Cette catégorie n'appartient pas à votre commerce.";
  }

  if (message.includes("category_name_required")) {
    return "Le nom de la catégorie est obligatoire.";
  }

  if (message.includes("expense_cancelled")) {
    return "Cette dépense est déjà annulée.";
  }

  if (message.includes("expense_not_found") || message.includes("forbidden")) {
    return "Dépense introuvable.";
  }

  if (message.includes("duplicate") || message.includes("unique")) {
    return "Cette catégorie existe déjà pour ce commerce.";
  }

  if (message.includes("not_authenticated") || message.includes("no_business")) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
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
