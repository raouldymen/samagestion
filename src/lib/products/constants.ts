import type { ProductUnit, StockMovementType, StockStatus } from "../../types/products";

export const PRODUCT_PAGE_SIZE = 20;
export const PRODUCT_IMAGE_BUCKET = "product-images";
export const PRODUCT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export const PRODUCT_UNITS: { value: ProductUnit; label: string }[] = [
  { value: "piece", label: "Pièce" },
  { value: "kg", label: "Kilogramme" },
  { value: "g", label: "Gramme" },
  { value: "litre", label: "Litre" },
  { value: "mètre", label: "Mètre" },
  { value: "carton", label: "Carton" },
  { value: "paquet", label: "Paquet" },
  { value: "autre", label: "Autre" },
];

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  purchase: "Achat",
  sale: "Vente",
  return: "Retour",
  adjustment: "Ajustement",
  loss: "Perte",
};

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "Disponible",
  low: "Stock faible",
  out: "Rupture",
};

export function getStockStatus(quantity: number, minimum: number): StockStatus {
  if (quantity <= 0) {
    return "out";
  }

  if (quantity <= minimum) {
    return "low";
  }

  return "in_stock";
}

export function isProductUnit(value: string): value is ProductUnit {
  return PRODUCT_UNITS.some((unit) => unit.value === value);
}

export function unitLabel(unit: ProductUnit) {
  return PRODUCT_UNITS.find((item) => item.value === unit)?.label ?? unit;
}

export function sanitizeSearch(value: string) {
  return value.replace(/[%(),\\"]/g, "").trim().slice(0, 80);
}

export function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return 0;
  }

  return Number.parseFloat(value.replace(",", "."));
}
