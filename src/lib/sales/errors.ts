export function mapSaleError(error: unknown): string {
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();

  if (lower.includes("insufficient_stock")) {
    const available = message.split(":")[1];

    if (available && !Number.isNaN(Number(available))) {
      return `Stock insuffisant. Stock disponible : ${available}`;
    }

    return "Stock insuffisant.";
  }

  if (lower.includes("sale_items_required") || lower.includes("sale_total_required")) {
    return "Ajoutez au moins un produit.";
  }

  if (lower.includes("invalid_discount")) {
    return "La remise doit être comprise entre 0 et le sous-total.";
  }

  if (lower.includes("payment_exceeds_total")) {
    return "Le montant payé ne peut pas dépasser le total.";
  }

  if (lower.includes("invalid_payment_method")) {
    return "Mode de paiement invalide.";
  }

  if (lower.includes("cashier_checkout_required")) {
    return "Cette vente doit être envoyée à la caisse pour être encaissée.";
  }

  if (lower.includes("invalid_customer")) {
    return "Ce client n'appartient pas à votre commerce.";
  }

  if (lower.includes("product_inactive")) {
    return "Ce produit n'est plus en vente.";
  }

  if (lower.includes("sale_already_cancelled")) {
    return "Cette vente est déjà annulée.";
  }

  if (lower.includes("sale_cancellation_window_expired")) {
    return "Une vente ne peut plus être annulée après 24 heures.";
  }

  if (lower.includes("sale_not_found") || lower.includes("forbidden")) {
    return "Vente introuvable.";
  }

  if (lower.includes("customer_name_required")) {
    return "Le nom du client est obligatoire.";
  }

  if (lower.includes("not_authenticated") || lower.includes("no_business")) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }

  if (lower.includes("failed to fetch") || lower.includes("network") || lower.includes("fetch")) {
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
