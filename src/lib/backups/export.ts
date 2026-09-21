import { requireBusinessSession } from "@/lib/auth/session";
import { serializeWorkbookSheets, type ExportFile, type ExportSheet } from "@/lib/reports/export";
import { createClient } from "@/lib/supabase/server";

const BACKUP_LIMIT = 10_000;

function cell(value: unknown): string | number {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return String(value);
}

async function backupTable(
  table: "categories" | "customers" | "products" | "suppliers" | "expenses" | "sales" | "sale_items" | "purchases" | "purchase_items",
  name: string,
  headers: string[],
  columns: string[],
  businessId: string,
  parentIds?: string[],
): Promise<ExportSheet> {
  const supabase = await createClient();
  let query;

  if (table === "sale_items") {
    query = supabase.from(table).select(columns.join(", ")).in("sale_id", parentIds ?? []).limit(BACKUP_LIMIT);
  } else if (table === "purchase_items") {
    query = supabase.from(table).select(columns.join(", ")).in("purchase_id", parentIds ?? []).limit(BACKUP_LIMIT);
  } else {
    query = supabase.from(table).select(columns.join(", ")).eq("business_id", businessId).limit(BACKUP_LIMIT);
  }

  const { data, error } = await query;
  if (error || !data) return { name, headers, rows: [] };

  return {
    name,
    headers,
    rows: data.map((row) => columns.map((column) => cell(row[column as keyof typeof row]))),
  };
}

export async function buildBusinessBackup(): Promise<ExportFile> {
  const session = await requireBusinessSession();
  if (session.role !== "owner") throw new Error("FORBIDDEN");

  const businessId = session.businessId;
  const [categories, customers, products, suppliers, expenses, sales, purchases] = await Promise.all([
    backupTable("categories", "Catégories", ["Nom"], ["name"], businessId),
    backupTable("customers", "Clients", ["Nom", "Téléphone", "E-mail", "Adresse", "Notes", "Actif", "Créé le"], ["name", "phone", "email", "address", "notes", "is_active", "created_at"], businessId),
    backupTable("products", "Produits", ["Nom", "Référence", "Description", "Prix achat", "Prix vente", "Stock", "Stock minimum", "Unité", "Actif", "Créé le"], ["name", "sku", "description", "purchase_price", "selling_price", "stock_quantity", "minimum_stock", "unit", "is_active", "created_at"], businessId),
    backupTable("suppliers", "Fournisseurs", ["Nom", "Téléphone", "E-mail", "Adresse", "Notes", "Actif", "Créé le"], ["name", "phone", "email", "address", "notes", "is_active", "created_at"], businessId),
    backupTable("expenses", "Dépenses", ["Date", "Description", "Montant", "Paiement", "Statut", "Notes", "Créé le"], ["expense_date", "description", "amount", "payment_method", "status", "notes", "created_at"], businessId),
    backupTable("sales", "Ventes", ["Identifiant", "Numéro", "Total", "Payé", "Reste", "Paiement", "Statut paiement", "Statut vente", "Notes", "Créée le"], ["id", "sale_number", "total", "amount_paid", "amount_due", "payment_method", "payment_status", "status", "notes", "created_at"], businessId),
    backupTable("purchases", "Achats", ["Identifiant", "Numéro", "Date", "Échéance", "Total", "Payé", "Reste", "Paiement", "Statut paiement", "Statut achat", "Notes", "Créé le"], ["id", "purchase_number", "purchase_date", "due_date", "total", "amount_paid", "amount_due", "payment_method", "payment_status", "status", "notes", "created_at"], businessId),
  ]);

  const [saleItems, purchaseItems] = await Promise.all([
    backupTable("sale_items", "Articles vendus", ["Vente", "Produit", "Quantité", "Prix unitaire", "Remise", "Total"], ["sale_id", "product_name", "quantity", "unit_price", "discount", "total"], businessId, sales.rows.map((row) => String(row[0]))),
    backupTable("purchase_items", "Articles achetés", ["Achat", "Produit", "Quantité", "Coût unitaire", "Total"], ["purchase_id", "product_name", "quantity", "unit_cost", "total"], businessId, purchases.rows.map((row) => String(row[0]))),
  ]);

  const generatedAt = new Intl.DateTimeFormat("fr-CA", { dateStyle: "short", timeZone: "Africa/Dakar" })
    .format(new Date())
    .replaceAll("/", "-");

  return serializeWorkbookSheets(
    [
      { name: "Informations", headers: ["Élément", "Valeur"], rows: [["Commerce", session.business.name], ["Date de sauvegarde", new Date().toISOString()], ["Limite par rubrique", BACKUP_LIMIT]] },
      categories, customers, products, suppliers, sales, saleItems, purchases, purchaseItems, expenses,
    ],
    `sauvegarde-${session.business.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${generatedAt}`,
  );
}
