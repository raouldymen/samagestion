export function mapProductError(error: unknown): string {
  const message = getErrorMessage(error).toLowerCase();

  if (message.includes("insufficient_stock")) {
    return "Stock insuffisant.";
  }

  if (message.includes("stock_must_use_rpc")) {
    return "Le stock doit être modifié via un ajustement.";
  }

  if (message.includes("product_name_required")) {
    return "Le nom du produit est obligatoire.";
  }

  if (message.includes("category_name_required")) {
    return "Le nom de la catégorie est obligatoire.";
  }

  if (message.includes("invalid_category")) {
    return "Cette catégorie n'appartient pas à votre commerce.";
  }

  if (message.includes("invalid_amount") || message.includes("invalid_quantity")) {
    return "Les montants et quantités doivent être positifs.";
  }

  if (message.includes("forbidden") || message.includes("product_not_found")) {
    return "Produit introuvable.";
  }

  if (message.includes("category_not_found")) {
    return "Catégorie introuvable.";
  }

  if (message.includes("duplicate") || message.includes("unique")) {
    return "Ce nom ou ce SKU existe déjà pour ce commerce.";
  }

  if (message.includes("not_authenticated") || message.includes("no_business")) {
    return "Votre session a expiré. Veuillez vous reconnecter.";
  }

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch")
  ) {
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

export function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}
