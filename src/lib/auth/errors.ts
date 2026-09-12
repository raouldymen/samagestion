export function mapAuthError(error: unknown): string {
  const message = getErrorMessage(error).toLowerCase();

  if (
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already")
  ) {
    return "Cette adresse e-mail est déjà utilisée.";
  }

  if (message.includes("invalid login") || message.includes("invalid credentials")) {
    return "E-mail ou mot de passe incorrect.";
  }

  if (message.includes("email not confirmed")) {
    return "Veuillez confirmer votre adresse e-mail avant de vous connecter.";
  }

  if (message.includes("password should be") || message.includes("password is too short")) {
    return "Le mot de passe ne respecte pas les règles de sécurité. Utilisez au moins 8 caractères.";
  }

  if (message.includes("rate limit") || message.includes("too many")) {
    return "Trop de tentatives. Veuillez réessayer dans quelques instants.";
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch")
  ) {
    return "Impossible de joindre le serveur. Vérifiez votre connexion internet.";
  }

  if (message.includes("not_authenticated")) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }

  if (message.includes("business_name_required")) {
    return "Le nom du commerce est obligatoire.";
  }

  if (
    message.includes("provider is not enabled") ||
    message.includes("unsupported provider")
  ) {
    return "La connexion Google n'est pas encore activée.";
  }

  if (message.includes("oauth") || message.includes("access_denied")) {
    return "La connexion Google a été annulée ou a échoué. Réessayez.";
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
