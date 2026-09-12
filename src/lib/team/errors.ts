export function mapTeamError(error: unknown): string {
  const message = getErrorMessage(error).toLowerCase();

  if (message.includes("invalid_email")) {
    return "Veuillez saisir une adresse e-mail valide.";
  }

  if (message.includes("invalid_role")) {
    return "Ce rôle n'est pas disponible.";
  }

  if (message.includes("already_member")) {
    return "Cette personne fait déjà partie de l'équipe.";
  }

  if (message.includes("owner_protected")) {
    return "Le propriétaire principal ne peut pas être modifié, suspendu ou retiré.";
  }

  if (message.includes("invitation_expired")) {
    return "Cette invitation a expiré.";
  }

  if (message.includes("invitation_cancelled")) {
    return "Cette invitation a été annulée.";
  }

  if (message.includes("invitation_accepted")) {
    return "Cette invitation a déjà été acceptée.";
  }

  if (message.includes("invitation_email_mismatch")) {
    return "Connectez-vous avec l'adresse e-mail invitée pour continuer.";
  }

  if (message.includes("invitation_not_found")) {
    return "Invitation introuvable.";
  }

  if (message.includes("member_not_found")) {
    return "Membre introuvable.";
  }

  if (message.includes("forbidden")) {
    return "Vous n'avez pas la permission d'effectuer cette action.";
  }

  if (message.includes("not_authenticated") || message.includes("no_business")) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }

  if (message.includes("service_role_not_configured")) {
    return "L'ajout de membres n'est pas configuré. Contactez le support.";
  }

  if (message.includes("gen_random_bytes")) {
    return "Impossible de créer l'invitation. Réessayez.";
  }

  if (
    message.includes("password should be") ||
    message.includes("password is too short") ||
    message.includes("weak_password")
  ) {
    return "Le mot de passe doit contenir au moins 8 caractères.";
  }

  if (message.includes("failed to fetch") || message.includes("fetch failed")) {
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
