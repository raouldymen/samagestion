"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can, canCancelSale } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { assertLimit } from "@/lib/subscriptions/access";
import { mapSubscriptionError } from "@/lib/subscriptions/errors";
import { isRedirectError } from "@/lib/products/errors";
import { mapSaleError } from "@/lib/sales/errors";
import { validateCustomerForm, validateSaleForm } from "@/lib/sales/validation";
import { createClient } from "@/lib/supabase/server";
import { searchSaleProducts } from "@/lib/sales/queries";
import type { AuthResult } from "@/types";
import type { SaleProductOption } from "@/types/sales";

function revalidateSales(saleId?: string) {
  revalidatePath("/sales");
  revalidatePath("/sales/new");
  revalidatePath("/dashboard");
  revalidatePath("/products");

  if (saleId) {
    revalidatePath(`/sales/${saleId}`);
  }
}

export async function searchSaleProductsAction(query: string): Promise<SaleProductOption[]> {
  const session = await requireBusinessSession();

  if (!can(session.role, "sales.create")) {
    return [];
  }

  return searchSaleProducts(query);
}

export async function createSaleAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const { values, fieldErrors, error } = validateSaleForm(formData);

  if (error) {
    return { error, fieldErrors };
  }

  try {
    const session = await requireBusinessSession();

    if (!can(session.role, "sales.create")) {
      return { error: "Vous n'avez pas l'autorisation de créer une vente." };
    }

    await assertLimit("sales_monthly");

    const supabase = await createClient();
    const { data, error: rpcError } = await supabase.rpc("create_sale", {
      p_items: values.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
      p_discount: values.discount,
      p_customer_id: values.customerId,
      p_payment_method: values.paymentMethod,
      p_amount_paid: values.amountPaid,
      p_notes: values.notes || null,
    });

    const sale = Array.isArray(data) ? data[0] : data;

    if (rpcError || !sale?.id) {
      return { error: mapSaleError(rpcError ?? new Error("SALE_NOT_FOUND")) };
    }

    revalidateSales(sale.id);
    redirect(`/sales/${sale.id}`);
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapSubscriptionError(caught) !== "Une erreur est survenue. Veuillez réessayer." ? mapSubscriptionError(caught) : mapSaleError(caught) };
  }
}

export async function cancelSaleAction(saleId: string): Promise<AuthResult> {
  try {
    const session = await requireBusinessSession();
    const supabase = await createClient();
    const { data: sale } = await supabase
      .from("sales")
      .select("id, user_id")
      .eq("id", saleId)
      .eq("business_id", session.businessId)
      .maybeSingle();

    if (!sale) {
      return { error: "Vente introuvable." };
    }

    if (!canCancelSale(session.role, sale.user_id === session.user.id)) {
      return { error: "Vous n'avez pas l'autorisation d'annuler cette vente." };
    }

    const { error } = await supabase.rpc("cancel_sale", { p_sale_id: saleId });

    if (error) {
      return { error: mapSaleError(error) };
    }

    revalidateSales(saleId);

    return { error: null, success: true, message: "Vente annulée. Le stock a été restauré." };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapSaleError(caught) };
  }
}

export async function createCustomerAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const { values, fieldErrors, error } = validateCustomerForm(formData);

  if (error) {
    return { error, fieldErrors };
  }

  try {
    const session = await requireBusinessSession();

    if (!can(session.role, "customers.create")) {
      return { error: "Vous n'avez pas l'autorisation d'ajouter un client." };
    }

    await assertLimit("customers");

    const supabase = await createClient();
    const { data, error: rpcError } = await supabase.rpc("create_customer", {
      p_name: values.name,
      p_phone: values.phone || null,
      p_email: null,
      p_address: null,
      p_notes: null,
    });

    const customer = Array.isArray(data) ? data[0] : data;

    if (rpcError || !customer?.id) {
      return { error: mapSaleError(rpcError ?? new Error("CUSTOMER_NAME_REQUIRED")) };
    }

    revalidatePath("/sales/new");
    revalidatePath("/customers");

    // Le picker utilise message comme id du nouveau client
    return { error: null, success: true, message: customer.id };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapSaleError(caught) };
  }
}
