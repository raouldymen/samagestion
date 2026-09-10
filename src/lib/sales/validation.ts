import type { FieldErrors } from "../../types";
import { cartSubtotal, isPaymentMethod, saleTotals } from "./constants";
import { toNumber } from "../products/constants";
import type { CartLine, PaymentMethod } from "../../types/sales";

export type SaleFormValues = {
  items: CartLine[];
  discount: number;
  customerId: string | null;
  paymentMethod: PaymentMethod;
  amountPaid: number;
  notes: string;
};

export function parseCartItems(raw: string): CartLine[] {
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
        typeof (item as CartLine).productId !== "string" ||
        typeof (item as CartLine).name !== "string"
      ) {
        return [];
      }

      const line = item as CartLine;

      return [
        {
          productId: line.productId,
          name: line.name,
          unitPrice: Number(line.unitPrice) || 0,
          stockQuantity: Number(line.stockQuantity) || 0,
          quantity: Number(line.quantity) || 0,
        },
      ];
    });
  } catch {
    return [];
  }
}

export function validateSaleForm(formData: FormData) {
  const items = parseCartItems(String(formData.get("items") ?? ""));
  const discount = toNumber(String(formData.get("discount") ?? "0"));
  const amountPaid = toNumber(String(formData.get("amountPaid") ?? "0"));
  const paymentMethodValue = String(formData.get("paymentMethod") ?? "cash");
  const customerId = String(formData.get("customerId") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const fieldErrors: FieldErrors = {};

  if (items.length === 0) {
    fieldErrors.items = "Ajoutez au moins un produit.";
  }

  items.forEach((item, index) => {
    if (item.quantity <= 0) {
      fieldErrors.items = "Chaque quantité doit être supérieure à 0.";
    }

    if (item.unitPrice < 0) {
      fieldErrors.items = "Les prix doivent être supérieurs ou égaux à 0.";
    }

    if (item.quantity > item.stockQuantity) {
      fieldErrors.items = `Stock insuffisant. Stock disponible : ${item.stockQuantity}`;
    }

    if (!item.productId) {
      fieldErrors[`item-${index}`] = "Produit invalide.";
    }
  });

  const subtotal = cartSubtotal(items);

  if (subtotal <= 0) {
    fieldErrors.items = "Le total de la vente doit être supérieur à 0.";
  }

  if (Number.isNaN(discount) || discount < 0) {
    fieldErrors.discount = "La remise doit être supérieure ou égale à 0.";
  } else if (discount > subtotal) {
    fieldErrors.discount = "La remise ne peut pas dépasser le sous-total.";
  }

  const totals = saleTotals(subtotal, Number.isNaN(discount) ? 0 : discount, Number.isNaN(amountPaid) ? 0 : amountPaid);

  if (Number.isNaN(amountPaid) || amountPaid < 0) {
    fieldErrors.amountPaid = "Le montant payé doit être supérieur ou égal à 0.";
  } else if (amountPaid > totals.total) {
    fieldErrors.amountPaid = "Le montant payé ne peut pas dépasser le total.";
  }

  if (!isPaymentMethod(paymentMethodValue)) {
    fieldErrors.paymentMethod = "Mode de paiement invalide.";
  }

  return {
    values: {
      items,
      discount,
      customerId: customerId || null,
      paymentMethod: (isPaymentMethod(paymentMethodValue) ? paymentMethodValue : "cash") as PaymentMethod,
      amountPaid,
      notes,
    } satisfies SaleFormValues,
    totals,
    fieldErrors,
    error: Object.keys(fieldErrors).length ? "Veuillez corriger les champs indiqués." : null,
  };
}

export function validateCustomerForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const fieldErrors: FieldErrors = {};

  if (!name) {
    fieldErrors.name = "Le nom du client est obligatoire.";
  }

  return {
    values: { name, phone },
    fieldErrors,
    error: Object.keys(fieldErrors).length ? "Veuillez corriger les champs indiqués." : null,
  };
}
