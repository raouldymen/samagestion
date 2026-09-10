export function mapSubscriptionError(error: unknown): string {
  const message = getErrorMessage(error);

  if (/PLAN_LIMIT_REACHED:products/i.test(message)) {
    return "Limite atteinte. Votre plan actuel ne permet pas d'ajouter plus de produits.";
  }
  if (/PLAN_LIMIT_REACHED:sales_monthly/i.test(message)) {
    return "Limite de ventes mensuelles atteinte. Passez à Pro pour continuer.";
  }
  if (/PLAN_LIMIT_REACHED:customers/i.test(message)) {
    return "Limite de clients atteinte. Passez à Pro pour en ajouter davantage.";
  }
  if (/PLAN_LIMIT_REACHED:team_members/i.test(message)) {
    return "Limite de membres atteinte pour votre plan.";
  }
  if (/FEATURE_NOT_AVAILABLE:financial_reports/i.test(message)) {
    return "Les rapports financiers sont disponibles avec le plan Pro.";
  }
  if (/FEATURE_NOT_AVAILABLE:exports/i.test(message)) {
    return "Les exports sont disponibles avec le plan Pro.";
  }
  if (/FEATURE_NOT_AVAILABLE:team_management/i.test(message)) {
    return "La gestion d'équipe est disponible à partir du plan Pro.";
  }
  if (/FEATURE_NOT_AVAILABLE:audit_logs/i.test(message)) {
    return "Le journal d'audit avancé est réservé au plan Business.";
  }
  if (/FEATURE_NOT_AVAILABLE/i.test(message)) {
    return "Cette fonctionnalité n'est pas incluse dans votre plan.";
  }
  if (/PAYMENT_REQUIRED/i.test(message)) {
    return "Un paiement est requis pour activer ce plan.";
  }
  if (/AMOUNT_MISMATCH/i.test(message)) {
    return "Le montant du paiement ne correspond pas au plan.";
  }
  if (/CURRENCY_MISMATCH|ENVIRONMENT_MISMATCH/i.test(message)) {
    return "Les informations de paiement sont invalides.";
  }
  if (/INVALID_SIGNATURE/i.test(message)) {
    return "Signature de paiement invalide.";
  }
  if (/PLAN_NOT_PAYABLE/i.test(message)) {
    return "Ce plan ne peut pas être payé.";
  }
  if (/SUBSCRIPTION_REQUIRED|PAYMENT_REQUIRED/i.test(message)) {
    return "Un abonnement payant est requis pour continuer.";
  }
  if (/SUBSCRIPTION_EXPIRED/i.test(message)) {
    return "Votre abonnement a expiré. Vous êtes revenu au plan Gratuit.";
  }
  if (/FORBIDDEN/i.test(message)) {
    return "Vous n'avez pas la permission de gérer l'abonnement.";
  }
  if (/PLAN_NOT_FOUND/i.test(message)) {
    return "Ce plan n'existe pas.";
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
  return String(error ?? "");
}
