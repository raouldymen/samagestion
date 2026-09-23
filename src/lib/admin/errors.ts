function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message;
  }

  return String(error ?? "");
}

export function mapAdminError(error: unknown) {
  const message = getErrorMessage(error);

  if (/BUSINESS_NOT_FOUND/i.test(message)) {
    return "Commerce introuvable.";
  }

  if (/PLAN_NOT_FOUND/i.test(message)) {
    return "Ce plan n'existe pas.";
  }

  if (/SERVICE_ROLE_NOT_CONFIGURED/i.test(message)) {
    return "Le compte super admin n'est pas configuré pour modifier les abonnements.";
  }

  if (/FORBIDDEN/i.test(message)) {
    return "Vous n'avez pas l'autorisation de modifier cet abonnement.";
  }

  if (/duplicate|unique/i.test(message)) {
    return "Impossible de mettre à jour cette formule. Réessayez.";
  }

  return "Une erreur est survenue. Veuillez réessayer.";
}
