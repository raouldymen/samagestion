export function mapPurchaseError(error: unknown): string {
  const message = getErrorMessage(error).toLowerCase();

  if (message.includes("insufficient_stock")) {
    const available = getErrorMessage(error).split(":")[1];

    if (available && !Number.isNaN(Number(available))) {
      return `Impossible d'annuler : une partie du stock a déjà été vendue. Stock disponible : ${available}`;
    }

    return "Impossible d'annuler : le stock actuel ne permet pas de retirer ces quantités.";
  }

  if (message.includes("purchase_items_required")) {
    return "Ajoutez au moins un produit.";
  }

  if (message.includes("invalid_discount")) {
    return "La remise doit être comprise entre 0 et le sous-total.";
  }

  if (message.includes("payment_exceeds_total")) {
    return "Le montant payé ne peut pas dépasser le total.";
  }

  if (message.includes("invalid_payment_method")) {
    return "Mode de paiement invalide.";
  }

  if (message.includes("invalid_supplier")) {
    return "Ce fournisseur n'appartient pas à votre commerce.";
  }

  if (message.includes("supplier_name_required")) {
    return "Le nom du fournisseur est obligatoire.";
  }

  if (message.includes("purchase_already_cancelled")) {
    return "Cet achat est déjà annulé.";
  }

  if (
    message.includes("purchase_not_found") ||
    message.includes("supplier_not_found") ||
    message.includes("forbidden")
  ) {
    return "Achat ou fournisseur introuvable.";
  }

  if (message.includes("duplicate") || message.includes("unique")) {
    return "Ce fournisseur existe déjà pour ce commerce.";
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
