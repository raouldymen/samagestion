import type { FieldErrors } from "../../types";
import { isProductUnit, toNumber } from "./constants";
import type { ProductUnit } from "../../types/products";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export function validateProductForm(formData: FormData, mode: "create" | "edit") {
  const name = readString(formData, "name");
  const categoryId = readString(formData, "categoryId");
  const sku = readString(formData, "sku");
  const description = readString(formData, "description");
  const unitValue = readString(formData, "unit") || "piece";
  const purchasePrice = toNumber(readString(formData, "purchasePrice"));
  const sellingPrice = toNumber(readString(formData, "sellingPrice"));
  const initialStock = toNumber(readString(formData, "initialStock"));
  const minimumStock = toNumber(readString(formData, "minimumStock"));
  const isActive = readString(formData, "isActive") !== "false";
  const fieldErrors: FieldErrors = {};

  if (!name) {
    fieldErrors.name = "Le nom du produit est obligatoire.";
  }

  if (Number.isNaN(purchasePrice) || purchasePrice < 0) {
    fieldErrors.purchasePrice = "Le prix d'achat doit être supérieur ou égal à 0.";
  }

  if (Number.isNaN(sellingPrice) || sellingPrice < 0) {
    fieldErrors.sellingPrice = "Le prix de vente doit être supérieur ou égal à 0.";
  }

  if (mode === "create" && (Number.isNaN(initialStock) || initialStock < 0)) {
    fieldErrors.initialStock = "Le stock initial doit être supérieur ou égal à 0.";
  }

  if (Number.isNaN(minimumStock) || minimumStock < 0) {
    fieldErrors.minimumStock = "Le stock minimum doit être supérieur ou égal à 0.";
  }

  if (!isProductUnit(unitValue)) {
    fieldErrors.unit = "Unité invalide.";
  }

  return {
    values: {
      name,
      categoryId: categoryId || null,
      sku,
      description,
      unit: unitValue as ProductUnit,
      purchasePrice,
      sellingPrice,
      initialStock,
      minimumStock,
      isActive,
    },
    fieldErrors,
    error: Object.keys(fieldErrors).length
      ? "Veuillez corriger les champs indiqués."
      : null,
  };
}

export function validateStockAdjustment(formData: FormData) {
  const direction = readString(formData, "direction");
  const quantity = toNumber(readString(formData, "quantity"));
  const reason = readString(formData, "reason");
  const fieldErrors: FieldErrors = {};

  if (direction !== "add" && direction !== "remove") {
    fieldErrors.direction = "Choisissez d'ajouter ou de retirer du stock.";
  }

  if (Number.isNaN(quantity) || quantity <= 0) {
    fieldErrors.quantity = "La quantité doit être supérieure à 0.";
  }

  if (!reason) {
    fieldErrors.reason = "Le motif est obligatoire.";
  }

  return {
    values: {
      direction: direction as "add" | "remove",
      quantity,
      reason,
    },
    fieldErrors,
    error: Object.keys(fieldErrors).length
      ? "Veuillez corriger les champs indiqués."
      : null,
  };
}

export function validateCategoryForm(formData: FormData) {
  const name = readString(formData, "name");
  const fieldErrors: FieldErrors = {};

  if (!name) {
    fieldErrors.name = "Le nom de la catégorie est obligatoire.";
  }

  return {
    values: { name },
    fieldErrors,
    error: Object.keys(fieldErrors).length
      ? "Veuillez corriger les champs indiqués."
      : null,
  };
}
