"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { validateCustomerForm } from "@/lib/customers/validation";
import { isRedirectError } from "@/lib/products/errors";
import { mapSaleError } from "@/lib/sales/errors";
import { assertLimit } from "@/lib/subscriptions/access";
import { createClient } from "@/lib/supabase/server";
import type { AuthResult } from "@/types";

function revalidateCustomers(customerId?: string) {
  revalidatePath("/customers");
  revalidatePath("/sales/new");
  revalidatePath("/sales");
  if (customerId) {
    revalidatePath(`/customers/${customerId}`);
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
      p_email: values.email || null,
      p_address: values.address || null,
      p_notes: values.notes || null,
    });

    const customer = Array.isArray(data) ? data[0] : data;
    if (rpcError || !customer?.id) {
      return { error: mapSaleError(rpcError ?? new Error("CUSTOMER_NAME_REQUIRED")) };
    }

    revalidateCustomers(customer.id);
    return {
      error: null,
      success: true,
      message: "Client ajouté avec succès.",
    };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }
    return { error: mapSaleError(caught) };
  }
}

export async function createCustomerAndRedirect(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const result = await createCustomerAction(_prev, formData);
  if (result.success) {
    redirect("/customers");
  }
  return result;
}

export async function updateCustomerAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const customerId = String(formData.get("customerId") ?? "").trim();
  const { values, fieldErrors, error } = validateCustomerForm(formData);

  if (!customerId) {
    return { error: "Client introuvable." };
  }
  if (error) {
    return { error, fieldErrors };
  }

  try {
    const session = await requireBusinessSession();
    if (!can(session.role, "customers.edit")) {
      return { error: "Vous n'avez pas l'autorisation de modifier un client." };
    }

    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc("update_customer", {
      p_customer_id: customerId,
      p_name: values.name,
      p_phone: values.phone || null,
      p_email: values.email || null,
      p_address: values.address || null,
      p_notes: values.notes || null,
      p_is_active: values.isActive,
    });

    if (rpcError) {
      return { error: mapSaleError(rpcError) };
    }

    revalidateCustomers(customerId);
    return { error: null, success: true, message: "Client mis à jour." };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }
    return { error: mapSaleError(caught) };
  }
}

export async function updateCustomerAndRedirect(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const customerId = String(formData.get("customerId") ?? "").trim();
  const result = await updateCustomerAction(_prev, formData);
  if (result.success && customerId) {
    redirect(`/customers/${customerId}`);
  }
  return result;
}

export async function archiveCustomerAction(formData: FormData): Promise<AuthResult> {
  const customerId = String(formData.get("customerId") ?? "").trim();
  const activate = String(formData.get("activate") ?? "") === "true";

  try {
    const session = await requireBusinessSession();
    if (!can(session.role, "customers.edit") && !can(session.role, "customers.delete")) {
      return { error: "Vous n'avez pas l'autorisation d'archiver ce client." };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("set_customer_active", {
      p_customer_id: customerId,
      p_is_active: activate,
    });

    if (error) {
      return { error: mapSaleError(error) };
    }

    revalidateCustomers(customerId);
    return {
      error: null,
      success: true,
      message: activate ? "Client réactivé." : "Client archivé.",
    };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }
    return { error: mapSaleError(caught) };
  }
}
