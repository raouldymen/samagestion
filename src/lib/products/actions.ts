"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireBusinessSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/access";
import { assertLimit } from "@/lib/subscriptions/access";
import { mapSubscriptionError } from "@/lib/subscriptions/errors";
import {
  PRODUCT_IMAGE_BUCKET,
  PRODUCT_IMAGE_MAX_BYTES,
} from "@/lib/products/constants";
import { isRedirectError, mapProductError } from "@/lib/products/errors";
import {
  validateCategoryForm,
  validateProductForm,
  validateStockAdjustment,
} from "@/lib/products/validation";
import { createClient } from "@/lib/supabase/server";
import { listProducts } from "@/lib/products/queries";
import type { AuthResult } from "@/types";
import type { SearchSuggestion } from "@/components/ui/list-search";

function revalidateProducts(productId?: string) {
  revalidatePath("/products");
  revalidatePath("/dashboard");

  if (productId) {
    revalidatePath(`/products/${productId}`);
    revalidatePath(`/products/${productId}/edit`);
  }
}

export async function searchProductSuggestionsAction(query: string): Promise<SearchSuggestion[]> {
  const session = await requireBusinessSession();
  assertPermission(session, "products.view");
  const { items } = await listProducts({ q: query, status: "active", page: 1 });

  return items.slice(0, 8).map((product) => ({
    value: product.name,
    label: product.name,
    detail: product.sku ? `Référence : ${product.sku}` : "Produit",
  }));
}

async function uploadProductImage(productId: string, businessId: string, file: File) {
  if (file.size === 0) {
    return null;
  }

  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    throw new Error("L'image ne doit pas dépasser 2 Mo.");
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("Seuls les fichiers JPG, PNG et WebP sont acceptés.");
  }

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${businessId}/${productId}.${extension}`;
  const supabase = await createClient();
  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });

  if (error) {
    throw error;
  }

  const { error: updateError } = await supabase.rpc("set_product_image", {
    p_product_id: productId,
    p_image_url: path,
  });

  if (updateError) {
    throw updateError;
  }

  return path;
}

export async function createProductAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const { values, fieldErrors, error } = validateProductForm(formData, "create");

  if (error) {
    return { error, fieldErrors };
  }

  try {
    const session = await requireBusinessSession();
    assertPermission(session, "products.create");
    await assertLimit("products");
    const supabase = await createClient();
    const { data, error: rpcError } = await supabase.rpc("create_product", {
      p_name: values.name,
      p_category_id: values.categoryId,
      p_sku: values.sku || null,
      p_description: values.description || null,
      p_purchase_price: values.purchasePrice,
      p_selling_price: values.sellingPrice,
      p_initial_stock: values.initialStock,
      p_minimum_stock: values.minimumStock,
      p_unit: values.unit,
    });

    const product = Array.isArray(data) ? data[0] : data;

    if (rpcError || !product?.id) {
      return {
        error:
          mapSubscriptionError(rpcError ?? "") !== "Une erreur est survenue. Veuillez réessayer."
            ? mapSubscriptionError(rpcError ?? "")
            : mapProductError(rpcError ?? new Error("PRODUCT_NOT_FOUND")),
      };
    }

    const image = formData.get("image");

    if (image instanceof File && image.size > 0) {
      await uploadProductImage(product.id, session.businessId, image);
    }

    revalidateProducts(product.id);
    redirect(`/products/${product.id}`);
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapProductError(caught) };
  }
}

export async function updateProductAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const productId = String(formData.get("productId") ?? "");
  const { values, fieldErrors, error } = validateProductForm(formData, "edit");

  if (!productId) {
    return { error: "Produit introuvable." };
  }

  if (error) {
    return { error, fieldErrors };
  }

  try {
    const session = await requireBusinessSession();
    assertPermission(session, "products.edit");
    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc("update_product", {
      p_product_id: productId,
      p_name: values.name,
      p_category_id: values.categoryId,
      p_sku: values.sku || null,
      p_description: values.description || null,
      p_purchase_price: values.purchasePrice,
      p_selling_price: values.sellingPrice,
      p_minimum_stock: values.minimumStock,
      p_unit: values.unit,
      p_is_active: values.isActive,
    });

    if (rpcError) {
      return { error: mapProductError(rpcError) };
    }

    const image = formData.get("image");

    if (image instanceof File && image.size > 0) {
      await uploadProductImage(productId, session.businessId, image);
    }

    revalidateProducts(productId);
    redirect(`/products/${productId}`);
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapProductError(caught) };
  }
}

export async function deactivateProductAction(productId: string): Promise<AuthResult> {
  try {
    const session = await requireBusinessSession();
    assertPermission(session, "products.delete");
    const supabase = await createClient();
    const { error } = await supabase.rpc("deactivate_product", {
      p_product_id: productId,
    });

    if (error) {
      return { error: mapProductError(error) };
    }

    revalidateProducts(productId);

    return { error: null, success: true, message: "Produit désactivé." };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapProductError(caught) };
  }
}

export async function adjustStockAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const productId = String(formData.get("productId") ?? "");
  const { values, fieldErrors, error } = validateStockAdjustment(formData);

  if (!productId) {
    return { error: "Produit introuvable." };
  }

  if (error) {
    return { error, fieldErrors };
  }

  const quantity = values.direction === "add" ? values.quantity : -values.quantity;

  try {
    const session = await requireBusinessSession();
    assertPermission(session, "stock.adjust");
    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc("apply_stock_change", {
      p_product_id: productId,
      p_quantity: quantity,
      p_type: "adjustment",
      p_reason: values.reason,
    });

    if (rpcError) {
      return { error: mapProductError(rpcError) };
    }

    revalidateProducts(productId);

    return { error: null, success: true, message: "Stock mis à jour." };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapProductError(caught) };
  }
}

export async function applyInventoryAction(_prev: AuthResult, formData: FormData): Promise<AuthResult> {
  let items: Array<{ productId: string; countedQuantity: number }> = [];
  try {
    const parsed: unknown = JSON.parse(String(formData.get("items") ?? "[]"));
    if (Array.isArray(parsed)) items = parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as { productId?: unknown; countedQuantity?: unknown };
      const countedQuantity = Number(row.countedQuantity);
      return typeof row.productId === "string" && Number.isFinite(countedQuantity) && countedQuantity >= 0 ? [{ productId: row.productId, countedQuantity }] : [];
    });
  } catch { /* handled below */ }
  if (items.length === 0 || items.length > 500) return { error: "Saisissez au moins un comptage valide." };
  try {
    const session = await requireBusinessSession();
    assertPermission(session, "stock.adjust");
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("apply_inventory_count", { p_items: items.map((item) => ({ product_id: item.productId, counted_quantity: item.countedQuantity })) });
    if (error) return { error: mapProductError(error) };
    revalidateProducts();
    revalidatePath("/products/inventory");
    return { error: null, success: true, message: `${Number(data ?? 0)} écart${Number(data ?? 0) > 1 ? "s" : ""} de stock validé${Number(data ?? 0) > 1 ? "s" : ""}.` };
  } catch (caught) {
    return { error: mapProductError(caught) };
  }
}

export async function createCategoryAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const { values, fieldErrors, error } = validateCategoryForm(formData);

  if (error) {
    return { error, fieldErrors };
  }

  try {
    const session = await requireBusinessSession();
    assertPermission(session, "products.edit");
    const supabase = await createClient();
    const { data, error: rpcError } = await supabase.rpc("create_category", {
      p_name: values.name,
    });

    if (rpcError) {
      return { error: mapProductError(rpcError) };
    }

    revalidatePath("/products");
    revalidatePath("/products/new");

    return { error: null, success: true, message: data?.id ?? "Catégorie créée." };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapProductError(caught) };
  }
}

export async function updateCategoryAction(
  _prev: AuthResult,
  formData: FormData,
): Promise<AuthResult> {
  const categoryId = String(formData.get("categoryId") ?? "");
  const { values, fieldErrors, error } = validateCategoryForm(formData);

  if (!categoryId) {
    return { error: "Catégorie introuvable." };
  }

  if (error) {
    return { error, fieldErrors };
  }

  try {
    const session = await requireBusinessSession();
    assertPermission(session, "products.edit");
    const supabase = await createClient();
    const { error: rpcError } = await supabase.rpc("update_category", {
      p_category_id: categoryId,
      p_name: values.name,
    });

    if (rpcError) {
      return { error: mapProductError(rpcError) };
    }

    revalidatePath("/products");

    return { error: null, success: true, message: "Catégorie mise à jour." };
  } catch (caught) {
    if (isRedirectError(caught)) {
      throw caught;
    }

    return { error: mapProductError(caught) };
  }
}
