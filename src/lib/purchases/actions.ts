"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { isRedirectError } from "@/lib/products/errors";
import { mapPurchaseError } from "@/lib/purchases/errors";
import { searchPurchaseProducts } from "@/lib/purchases/queries";
import { validatePurchaseForm, validateSupplierForm } from "@/lib/purchases/validation";
import { createClient } from "@/lib/supabase/server";
import type { AuthResult } from "@/types";
import type { PurchaseProductOption } from "@/types/purchases";

function revalidatePurchases(purchaseId?: string, supplierId?: string) {
  revalidatePath("/purchases");
  revalidatePath("/purchases/new");
  revalidatePath("/suppliers");
  revalidatePath("/suppliers/debts");
  revalidatePath("/dashboard");
  revalidatePath("/products");

  if (purchaseId) {
    revalidatePath(`/purchases/${purchaseId}`);
  }

  if (supplierId) {
    revalidatePath(`/suppliers/${supplierId}`);
  }
}

export async function searchPurchaseProductsAction(query: string): Promise<PurchaseProductOption[]> {
  const session = await requireBusinessSession();

  if (!can(session.role, "purchases.manage")) {
    return [];
  }

  return searchPurchaseProducts(query);
}

export async function createPurchaseAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const { values, fieldErrors, error } = validatePurchaseForm(formData);

  if (error) {
    return { error, fieldErrors };
  }

  try {
    const session = await requireBusinessSession();

    if (!can(session.role, "purchases.manage")) {
      return { error: "Vous n'avez pas l'autorisation d'enregistrer un achat." };
    }

    const supabase = await createClient();
    const { data, error: rpcError } = await supabase.rpc("create_purchase", {
      p_items: values.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_cost: item.unitCost,
      })),
      p_discount: values.discount,
      p_supplier_id: values.supplierId,
      p_payment_method: values.paymentMethod,
      p_amount_paid: values.amountPaid,
      p_notes: values.notes || null,
      p_purchase_date: values.purchaseDate,
    });

    const purchase = Array.isArray(data) ? data[0] : data;

    if (rpcError || !purchase?.id) {
      return { error: mapPurchaseError(rpcError ?? new Error("PURCHASE_NOT_FOUND")) };
    }

    revalidatePurchases(purchase.id, purchase.supplier_id ?? undefined);
    redirect(`/purchases/${purchase.id}`);
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapPurchaseError(caught) };
  }
}

export async function cancelPurchaseAction(purchaseId: string): Promise<AuthResult> {
  try {
    const session = await requireBusinessSession();

    if (!can(session.role, "purchases.manage")) {
      return { error: "Vous n'avez pas l'autorisation d'annuler un achat." };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("cancel_purchase", { p_purchase_id: purchaseId });

    if (error) {
      return { error: mapPurchaseError(error) };
    }

    revalidatePurchases(purchaseId);
    return { error: null, success: true, message: "Achat annulé. Le stock a été retiré." };
  } catch (caught) {
    return { error: mapPurchaseError(caught) };
  }
}

export async function createSupplierAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const { values, fieldErrors, error } = validateSupplierForm(formData);

  if (error) {
    return { error, fieldErrors };
  }

  try {
    const session = await requireBusinessSession();

    if (!can(session.role, "purchases.manage")) {
      return { error: "Vous n'avez pas l'autorisation d'ajouter un fournisseur." };
    }

    const supabase = await createClient();
    const { data, error: rpcError } = await supabase.rpc("create_supplier", {
      p_name: values.name,
      p_phone: values.phone || null,
      p_email: values.email || null,
      p_address: values.address || null,
      p_notes: values.notes || null,
    });

    const supplier = Array.isArray(data) ? data[0] : data;

    if (rpcError || !supplier?.id) {
      return { error: mapPurchaseError(rpcError ?? new Error("SUPPLIER_NOT_FOUND")) };
    }

    revalidatePurchases(undefined, supplier.id);

    if (String(formData.get("redirect") ?? "") === "detail") {
      redirect(`/suppliers/${supplier.id}`);
    }

    return { error: null, success: true, message: supplier.id };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapPurchaseError(caught) };
  }
}

export async function updateSupplierAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const { values, fieldErrors, error } = validateSupplierForm(formData);

  if (error || !values.supplierId) {
    return { error: error ?? "Fournisseur introuvable.", fieldErrors };
  }

  try {
    const session = await requireBusinessSession();

    if (!can(session.role, "purchases.manage")) {
      return { error: "Vous n'avez pas l'autorisation de modifier un fournisseur." };
    }

    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc("update_supplier", {
      p_supplier_id: values.supplierId,
      p_name: values.name,
      p_phone: values.phone || null,
      p_email: values.email || null,
      p_address: values.address || null,
      p_notes: values.notes || null,
      p_is_active: values.isActive,
    });

    if (rpcError) {
      return { error: mapPurchaseError(rpcError) };
    }

    revalidatePurchases(undefined, values.supplierId);
    redirect(`/suppliers/${values.supplierId}`);
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapPurchaseError(caught) };
  }
}
