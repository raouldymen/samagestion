"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { can, canCancelSale } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import { assertLimit } from "@/lib/subscriptions/access";
import { mapSubscriptionError } from "@/lib/subscriptions/errors";
import { isRedirectError } from "@/lib/products/errors";
import { mapSaleError } from "@/lib/sales/errors";
import { canCancelSaleUntil, isPaymentMethod } from "@/lib/sales/constants";
import { sanitizeSearch } from "@/lib/products/constants";
import { validateCustomerForm, validateSaleForm } from "@/lib/sales/validation";
import { createClient } from "@/lib/supabase/server";
import {
  getCashierCheckoutSummary,
  isCashierCheckoutRequired,
  listCashierSaleQueue,
  listCashierTodaySales,
  listOwnerSaleCollections,
  searchSaleProducts,
  type CashierCheckoutSummary,
  type CashierQueuedSale,
  type CashierTodaySale,
  type OwnerSaleCollection,
} from "@/lib/sales/queries";
import type { SearchSuggestion } from "@/components/ui/list-search";
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

export async function searchSaleSuggestionsAction(query: string): Promise<SearchSuggestion[]> {
  const session = await requireBusinessSession();

  if (!can(session.role, "sales.view")) {
    return [];
  }

  const supabase = await createClient();
  const search = sanitizeSearch(query);
  let matchedCustomers: Array<{ id: string; name: string }> = [];

  if (search) {
    const { data } = await supabase
      .from("customers")
      .select("id, name")
      .eq("business_id", session.businessId)
      .ilike("name", `%${search}%`)
      .limit(8);
    matchedCustomers = data ?? [];
  }

  let request = supabase
    .from("sales")
    .select("sale_number, customer_id")
    .eq("business_id", session.businessId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(8);

  if (!can(session.role, "sales.list_all")) {
    request = request.eq("user_id", session.user.id);
  }

  if (search) {
    const customerIds = matchedCustomers.map((customer) => customer.id);
    request = customerIds.length
      ? request.or(`sale_number.ilike.%${search}%,customer_id.in.(${customerIds.join(",")})`)
      : request.ilike("sale_number", `%${search}%`);
  }

  const { data: sales, error } = await request;
  if (error || !sales) {
    return [];
  }

  const names = new Map(matchedCustomers.map((customer) => [customer.id, customer.name]));
  const unknownCustomerIds = [...new Set(
    sales.map((sale) => sale.customer_id).filter((id): id is string => typeof id === "string" && !names.has(id)),
  )];
  if (unknownCustomerIds.length > 0) {
    const { data: customers } = await supabase.from("customers").select("id, name").in("id", unknownCustomerIds);
    for (const customer of customers ?? []) {
      names.set(customer.id, customer.name);
    }
  }

  return sales.map((sale) => ({
    value: sale.sale_number,
    label: sale.sale_number,
    detail: sale.customer_id ? (names.get(sale.customer_id) ?? "Client") : "Vente comptoir",
  }));
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

    const supabase = await createClient();

    // Un vendeur envoie toujours à la caisse et un caissier valide toujours lui-même :
    // inutile de faire un aller-retour supplémentaire pour connaître ce réglage.
    const cashierCheckoutRequired =
      session.role === "owner" || session.role === "manager"
        ? await isCashierCheckoutRequired()
        : false;
    const checkoutMode = String(formData.get("checkoutMode") ?? "");
    const ownerDirectCheckout = session.role === "owner" && cashierCheckoutRequired && checkoutMode === "direct";
    if (session.role !== "cashier" && (session.role === "seller" || (cashierCheckoutRequired && !ownerDirectCheckout))) {
      const { error: queueError } = await supabase.rpc("queue_sale_for_cashier", {
        p_items: values.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
        p_discount: values.discount,
        p_customer_id: values.customerId,
        p_notes: values.notes || null,
      });

      if (queueError) {
        return { error: mapSaleError(queueError) };
      }

      revalidatePath("/sales/checkout");
      redirect("/sales?queued=1");
    }

    await assertLimit("sales_monthly");
    const salePayload = {
      p_items: values.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
      })),
      p_discount: values.discount,
      p_customer_id: values.customerId,
      p_payment_method: values.paymentMethod,
      p_amount_paid: values.amountPaid,
      p_notes: values.notes || null,
    };
    const { data, error: rpcError } = ownerDirectCheckout
      ? await supabase.rpc("create_owner_sale", salePayload)
      : await supabase.rpc("create_sale", salePayload);

    const sale = Array.isArray(data) ? data[0] : data;

    if (rpcError || !sale?.id) {
      return { error: mapSaleError(rpcError ?? new Error("SALE_NOT_FOUND")) };
    }

    revalidateSales(sale.id);
    redirect(`/sales/${sale.id}/receipt`);
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapSubscriptionError(caught) !== "Une erreur est survenue. Veuillez réessayer." ? mapSubscriptionError(caught) : mapSaleError(caught) };
  }
}

export async function syncOfflineSaleAction(formData: FormData): Promise<AuthResult> {
  const { values, error } = validateSaleForm(formData);
  if (error) return { error: "Cette vente hors connexion doit être corrigée avant son envoi." };

  try {
    const session = await requireBusinessSession();
    if (!can(session.role, "sales.create")) {
      return { error: "Vous n'avez plus l'autorisation d'envoyer cette vente." };
    }

    const supabase = await createClient();
    const cashierCheckoutRequired =
      session.role === "owner" || session.role === "manager"
        ? await isCashierCheckoutRequired()
        : false;
    const checkoutMode = String(formData.get("checkoutMode") ?? "");
    const ownerDirectCheckout = session.role === "owner" && cashierCheckoutRequired && checkoutMode === "direct";
    if (session.role !== "cashier" && (session.role === "seller" || (cashierCheckoutRequired && !ownerDirectCheckout))) {
      const { error: queueError } = await supabase.rpc("queue_sale_for_cashier", {
        p_items: values.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
        p_discount: values.discount,
        p_customer_id: values.customerId,
        p_notes: values.notes || null,
      });
      if (queueError) return { error: mapSaleError(queueError) };
      revalidatePath("/sales/checkout");
      revalidateSales();
      return { error: null, success: true, message: "Vente envoyée à la caisse." };
    }

    await assertLimit("sales_monthly");
    const { data, error: rpcError } = ownerDirectCheckout
      ? await supabase.rpc("create_owner_sale", {
        p_items: values.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
        p_discount: values.discount,
        p_customer_id: values.customerId,
        p_payment_method: values.paymentMethod,
        p_amount_paid: values.amountPaid,
        p_notes: values.notes || null,
      })
      : await supabase.rpc("create_sale", {
        p_items: values.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
        p_discount: values.discount,
        p_customer_id: values.customerId,
        p_payment_method: values.paymentMethod,
        p_amount_paid: values.amountPaid,
        p_notes: values.notes || null,
      });
    const sale = Array.isArray(data) ? data[0] : data;
    if (rpcError || !sale?.id) return { error: mapSaleError(rpcError ?? new Error("SALE_NOT_FOUND")) };
    revalidateSales(sale.id);
    revalidatePath("/sales/checkout");
    return { error: null, success: true, message: "Vente synchronisée." };
  } catch (caught) {
    return { error: mapSubscriptionError(caught) !== "Une erreur est survenue. Veuillez réessayer." ? mapSubscriptionError(caught) : mapSaleError(caught) };
  }
}

export async function getCashierCheckoutLiveDataAction(): Promise<{
  sales: CashierQueuedSale[];
  summary: CashierCheckoutSummary;
  ownerCollections: OwnerSaleCollection[];
  todaySales: CashierTodaySale[];
}> {
  const [sales, summary, ownerCollections, todaySales] = await Promise.all([
    listCashierSaleQueue(),
    getCashierCheckoutSummary(),
    listOwnerSaleCollections(),
    listCashierTodaySales(),
  ]);

  return { sales, summary, ownerCollections, todaySales };
}

export async function completeCashierSaleAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const queueId = String(formData.get("queueId") ?? "").trim();
  const paymentMethod = String(formData.get("paymentMethod") ?? "cash");
  const amountPaid = Number(formData.get("amountPaid") ?? "0");

  if (!queueId || !Number.isFinite(amountPaid) || amountPaid < 0) {
    return { error: "Vérifiez les informations de paiement." };
  }

  if (!isPaymentMethod(paymentMethod)) {
    return { error: "Mode de paiement invalide." };
  }

  try {
    const session = await requireBusinessSession();
    if (!can(session.role, "sales.create") || session.role === "seller") {
      return { error: "Vous n'avez pas l'autorisation d'encaisser cette vente." };
    }

    if (session.role !== "cashier" && await isCashierCheckoutRequired()) {
      return { error: "Un caissier actif doit valider cette vente." };
    }

    await assertLimit("sales_monthly");
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("complete_cashier_sale", {
      p_queue_id: queueId,
      p_payment_method: paymentMethod,
      p_amount_paid: amountPaid,
    });

    const sale = Array.isArray(data) ? data[0] : data;
    if (error || !sale?.id) {
      return { error: mapSaleError(error ?? new Error("SALE_NOT_FOUND")) };
    }

    revalidateSales(sale.id);
    revalidatePath("/sales/checkout");
    redirect(`/sales/${sale.id}/receipt?from=checkout`);
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }
    return { error: mapSubscriptionError(caught) !== "Une erreur est survenue. Veuillez réessayer." ? mapSubscriptionError(caught) : mapSaleError(caught) };
  }
}

export async function closeCashierDayAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const countedAmount = Number(formData.get("countedAmount") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (!Number.isFinite(countedAmount) || countedAmount < 0) return { error: "Saisissez le montant réellement compté." };
  try {
    const session = await requireBusinessSession();
    if (session.role !== "cashier") return { error: "Seul le caissier peut clôturer sa caisse." };
    const supabase = await createClient();
    const { error } = await supabase.rpc("close_cashier_day", { p_counted_amount: countedAmount, p_notes: notes || null });
    if (error) return { error: error.message.includes("CASH_DAY_ALREADY_CLOSED") ? "La caisse est déjà clôturée pour aujourd'hui." : "La clôture n'a pas pu être enregistrée." };
    revalidatePath("/sales/checkout");
    revalidatePath("/sales/checkout/closures");
    return { error: null, success: true, message: "Clôture de caisse enregistrée." };
  } catch {
    return { error: "La clôture n'a pas pu être enregistrée." };
  }
}

export async function cancelCashierSaleAction(queueId: string): Promise<AuthResult> {
  try {
    const session = await requireBusinessSession();
    if (!can(session.role, "sales.create") || session.role === "seller") {
      return { error: "Vous n'avez pas l'autorisation d'annuler cette vente." };
    }
    if (session.role !== "cashier" && await isCashierCheckoutRequired()) {
      return { error: "Un caissier actif doit gérer cette vente." };
    }
    const supabase = await createClient();
    const { error } = await supabase.rpc("cancel_cashier_sale", { p_queue_id: queueId });
    if (error) return { error: mapSaleError(error) };
    revalidatePath("/sales/checkout");
    return { error: null, success: true, message: "Vente annulée avant encaissement." };
  } catch (caught) {
    return { error: mapSaleError(caught) };
  }
}

export async function markOwnerSaleCollectionAction(collectionId: string): Promise<AuthResult> {
  try {
    const session = await requireBusinessSession();
    if (!can(session.role, "sales.create") || session.role === "seller") {
      return { error: "Vous n'avez pas l'autorisation d'encaisser cette vente." };
    }
    if (session.role !== "cashier" && await isCashierCheckoutRequired()) {
      return { error: "Un caissier actif doit encaisser cette vente." };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("mark_owner_sale_collection", { p_collection_id: collectionId });
    if (error) return { error: mapSaleError(error) };

    revalidatePath("/sales/checkout");
    return { error: null, success: true };
  } catch (caught) {
    return { error: mapSaleError(caught) };
  }
}

export async function updateCashierSaleAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const queueId = String(formData.get("queueId") ?? "").trim();
  const customerId = String(formData.get("customerId") ?? "").trim();
  const discount = Number(formData.get("discount") ?? "0");
  const notes = String(formData.get("notes") ?? "").trim();
  const rawItems = String(formData.get("items") ?? "");

  let items: Array<{ product_id: string; quantity: number; unit_price: number }> = [];
  try {
    const parsed: unknown = JSON.parse(rawItems);
    if (Array.isArray(parsed)) {
      items = parsed.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const value = item as { productId?: unknown; quantity?: unknown; unitPrice?: unknown };
        const productId = String(value.productId ?? "").trim();
        const quantity = Number(value.quantity);
        const unitPrice = Number(value.unitPrice);
        return productId && Number.isFinite(quantity) && quantity > 0 && Number.isFinite(unitPrice) && unitPrice > 0
          ? [{ product_id: productId, quantity, unit_price: unitPrice }]
          : [];
      });
    }
  } catch {
    return { error: "Les produits à modifier sont invalides." };
  }

  if (!queueId || items.length === 0 || !Number.isFinite(discount) || discount < 0) {
    return { error: "Vérifiez les produits, les prix et la remise." };
  }

  try {
    const session = await requireBusinessSession();
    if (!can(session.role, "sales.create") || session.role === "seller") {
      return { error: "Vous n'avez pas l'autorisation de modifier cette vente." };
    }
    if (session.role !== "cashier" && await isCashierCheckoutRequired()) {
      return { error: "Un caissier actif doit gérer cette vente." };
    }

    const supabase = await createClient();
    const { error } = await supabase.rpc("update_cashier_sale", {
      p_queue_id: queueId,
      p_items: items,
      p_discount: discount,
      p_customer_id: customerId || null,
      p_notes: notes || null,
    });
    if (error) return { error: mapSaleError(error) };

    revalidatePath("/sales/checkout");
    return { error: null, success: true, message: "Vente modifiée." };
  } catch (caught) {
    return { error: mapSaleError(caught) };
  }
}

export async function cancelSaleAction(saleId: string): Promise<AuthResult> {
  try {
    const session = await requireBusinessSession();
    const supabase = await createClient();
    const { data: sale } = await supabase
      .from("sales")
      .select("id, user_id, created_at")
      .eq("id", saleId)
      .eq("business_id", session.businessId)
      .maybeSingle();

    if (!sale) {
      return { error: "Vente introuvable." };
    }

    if (!canCancelSale(session.role, sale.user_id === session.user.id)) {
      return { error: "Vous n'avez pas l'autorisation d'annuler cette vente." };
    }

    if (!canCancelSaleUntil(sale.created_at)) {
      return { error: "Une vente ne peut plus être annulée après 24 heures." };
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

export async function returnSaleForCreditAction(saleId: string): Promise<AuthResult> {
  try {
    const session = await requireBusinessSession();
    if (!['owner', 'manager', 'cashier'].includes(session.role)) return { error: "Vous n'avez pas l'autorisation d'enregistrer un retour." };
    const supabase = await createClient();
    const { error } = await supabase.rpc("return_sale_for_credit", { p_sale_id: saleId, p_reason: null });
    if (error) return { error: error.message === 'SALE_ALREADY_RETURNED' ? 'Cette vente a déjà fait l’objet d’un retour.' : mapSaleError(error) };
    revalidateSales(saleId);
    return { error: null, success: true, message: "Retour enregistré. Le stock a été restauré et un avoir a été créé." };
  } catch (caught) { return { error: mapSaleError(caught) }; }
}

export async function returnSaleItemsAction(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  const saleId = String(formData.get("saleId") ?? "");
  const items = JSON.parse(String(formData.get("items") ?? "[]")) as unknown;
  try { const session = await requireBusinessSession(); if (!['owner','manager','cashier'].includes(session.role)) return { error: "Vous n'avez pas l'autorisation d'enregistrer un retour." }; const supabase = await createClient(); const { error } = await supabase.rpc("return_sale_items", { p_sale_id: saleId, p_items: items as never, p_reason: null }); if (error) return { error: "Le retour est impossible : vérifiez les quantités disponibles." }; revalidateSales(saleId); return { error:null,success:true,message:"Retour enregistré et stock restauré." }; } catch (caught) { return { error: mapSaleError(caught) }; }
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
