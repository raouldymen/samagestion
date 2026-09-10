import type { FieldErrors } from "@/types";
import { isPaymentMethod } from "@/lib/sales/constants";
import { toNumber } from "@/lib/products/constants";
import { purchaseCartSubtotal, purchaseTotals } from "@/lib/purchases/constants";
import type { PaymentMethod, PurchaseCartLine } from "@/types/purchases";

export type PurchaseFormValues = {
  items: PurchaseCartLine[];
  discount: number;
  supplierId: string | null;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  notes: string;
  purchaseDate: string;
};

export function parsePurchaseCart(raw: string): PurchaseCartLine[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item) => {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as PurchaseCartLine).productId !== "string" ||
        typeof (item as PurchaseCartLine).name !== "string"
      ) {
        return [];
      }

      const line = item as PurchaseCartLine;

      return [
        {
          productId: line.productId,
          name: line.name,
          unitCost: Number(line.unitCost) || 0,
          stockQuantity: Number(line.stockQuantity) || 0,
          quantity: Number(line.quantity) || 0,
        },
      ];
    });
  } catch {
    return [];
  }
}

export function validatePurchaseForm(formData: FormData) {
  const items = parsePurchaseCart(String(formData.get("items") ?? ""));
  const discount = toNumber(String(formData.get("discount") ?? "0"));
  const amountPaid = toNumber(String(formData.get("amountPaid") ?? "0"));
  const paymentMethodValue = String(formData.get("paymentMethod") ?? "cash");
  const supplierId = String(formData.get("supplierId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const purchaseDate = String(formData.get("purchaseDate") ?? "").trim();
  const fieldErrors: FieldErrors = {};

  if (items.length === 0) {
    fieldErrors.items = "Ajoutez au moins un produit.";
  }

  items.forEach((item, index) => {
    if (item.quantity <= 0) {
      fieldErrors.items = "Chaque quantité doit être supérieure à 0.";
    }

    if (item.unitCost < 0) {
      fieldErrors.items = "Le coût d'achat doit être supérieur ou égal à 0.";
    }

    if (!item.productId) {
      fieldErrors[`item-${index}`] = "Produit invalide.";
    }
  });

  const subtotal = purchaseCartSubtotal(items);

  if (Number.isNaN(discount) || discount < 0) {
    fieldErrors.discount = "La remise doit être supérieure ou égale à 0.";
  } else if (discount > subtotal) {
    fieldErrors.discount = "La remise ne peut pas dépasser le sous-total.";
  }

  const totals = purchaseTotals(
    subtotal,
    Number.isNaN(discount) ? 0 : discount,
    Number.isNaN(amountPaid) ? 0 : amountPaid,
  );

  if (Number.isNaN(amountPaid) || amountPaid < 0) {
    fieldErrors.amountPaid = "Le montant payé doit être supérieur ou égal à 0.";
  } else if (amountPaid > totals.total) {
    fieldErrors.amountPaid = "Le montant payé ne peut pas dépasser le total.";
  }

  if (!isPaymentMethod(paymentMethodValue)) {
    fieldErrors.paymentMethod = "Mode de paiement invalide.";
  }

  if (!purchaseDate) {
    fieldErrors.purchaseDate = "La date est obligatoire.";
  }

  return {
    values: {
      items,
      discount,
      supplierId: supplierId || null,
      paymentMethod: (isPaymentMethod(paymentMethodValue) ? paymentMethodValue : "cash") as PaymentMethod,
      amountPaid,
      notes,
      purchaseDate,
    } satisfies PurchaseFormValues,
    totals,
    fieldErrors,
    error: Object.keys(fieldErrors).length ? "Veuillez corriger les champs indiqués." : null,
  };
}

export function validateSupplierForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const supplierId = String(formData.get("supplierId") ?? "").trim();
  const isActive = String(formData.get("isActive") ?? "true") !== "false";
  const fieldErrors: FieldErrors = {};

  if (!name) {
    fieldErrors.name = "Le nom du fournisseur est obligatoire.";
  }

  return {
    values: { name, phone, email, address, notes, supplierId: supplierId || undefined, isActive },
    fieldErrors,
    error: Object.keys(fieldErrors).length ? "Veuillez corriger les champs indiqués." : null,
  };
}
