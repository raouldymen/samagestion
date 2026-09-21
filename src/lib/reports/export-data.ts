import { requireReportsSession } from "@/lib/reports/access";
import {
  DATASET_FILENAMES,
  serializeWorkbook,
  type ExportDataset,
  type ExportFile,
  type ExportFormat,
  type ExportSheet,
} from "@/lib/reports/export";
import { reportPeriodRange } from "@/lib/reports/period";
import { getReportsBundle } from "@/lib/reports/queries";
import { PAYMENT_STATUS_LABELS, paymentMethodLabel, SALE_STATUS_LABELS } from "@/lib/sales/constants";
import { createClient } from "@/lib/supabase/server";
import type { ReportPeriod } from "@/types/reports";

const EXPORT_LIMIT = 5000;

function asNumber(value: string | number | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function dateLabel(value: string) {
  return value.slice(0, 10);
}

export async function buildReportExport(input: {
  dataset: ExportDataset;
  period: ReportPeriod;
  from?: string;
  to?: string;
  format?: ExportFormat;
}): Promise<ExportFile> {
  await requireReportsSession();
  const range = reportPeriodRange(input.period, input.from, input.to);
  const sheet = await loadExportSheet(input.dataset, input.period, input.from, input.to);
  const basename = `${DATASET_FILENAMES[input.dataset]}-${range.fromDate}-${range.toDateInclusive}`;

  return await serializeWorkbook(sheet, basename, input.format ?? "csv");
}

async function loadExportSheet(
  dataset: ExportDataset,
  period: ReportPeriod,
  from?: string,
  to?: string,
): Promise<ExportSheet> {
  if (dataset === "sales") {
    return exportSales(period, from, to);
  }

  if (dataset === "expenses") {
    return exportExpenses(period, from, to);
  }

  if (dataset === "purchases") {
    return exportPurchases(period, from, to);
  }

  const bundle = await getReportsBundle(period, from, to);

  if (dataset === "products") {
    return {
      name: "Produits",
      headers: ["Produit", "Quantité vendue", "CA", "Coût", "Marge", "Taux de marge"],
      rows: bundle.topSold.map((item) => [
        item.name,
        item.quantity,
        item.revenue,
        item.cogs,
        item.margin,
        item.marginRate,
      ]),
    };
  }

  if (dataset === "customers") {
    return {
      name: "Clients",
      headers: ["Client", "Nombre de ventes", "Montant dépensé", "Dette"],
      rows: bundle.topCustomers.map((item) => [
        item.name,
        item.salesCount,
        item.spent,
        item.due,
      ]),
    };
  }

  return {
    name: "Paiements",
    headers: ["Mode de paiement", "Nombre de ventes", "Montant", "Pourcentage"],
    rows: bundle.payments.map((item) => [
      item.label,
      item.salesCount,
      item.amount,
      item.percent,
    ]),
  };
}

async function exportSales(period: ReportPeriod, from?: string, to?: string): Promise<ExportSheet> {
  const session = await requireReportsSession();
  const range = reportPeriodRange(period, from, to);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales")
    .select(
      "sale_number, created_at, total, amount_paid, amount_due, payment_method, payment_status, status, customer_id",
    )
    .eq("business_id", session.businessId)
    .eq("status", "completed")
    .gte("created_at", range.from)
    .lt("created_at", range.to)
    .order("created_at", { ascending: true })
    .limit(EXPORT_LIMIT);

  if (error || !data) {
    return { name: "Ventes", headers: ["Numéro", "Date", "Client", "CA", "Encaissé", "Créance", "Paiement", "Statut"], rows: [] };
  }

  const customerIds = [...new Set(data.map((row) => row.customer_id).filter((id): id is string => Boolean(id)))];
  const { data: customers } = customerIds.length
    ? await supabase.from("customers").select("id, name").eq("business_id", session.businessId).in("id", customerIds)
    : { data: [] as { id: string; name: string }[] };
  const names = new Map((customers ?? []).map((customer) => [customer.id, customer.name]));

  return {
    name: "Ventes",
    headers: ["Numéro", "Date", "Client", "CA", "Encaissé", "Créance", "Paiement", "Statut"],
    rows: data.map((row) => [
      row.sale_number,
      dateLabel(row.created_at),
      row.customer_id ? (names.get(row.customer_id) ?? "Client") : "Passage",
      asNumber(row.total),
      asNumber(row.amount_paid),
      asNumber(row.amount_due),
      paymentMethodLabel(row.payment_method),
      `${PAYMENT_STATUS_LABELS[row.payment_status]} / ${SALE_STATUS_LABELS[row.status]}`,
    ]),
  };
}

async function exportExpenses(period: ReportPeriod, from?: string, to?: string): Promise<ExportSheet> {
  const session = await requireReportsSession();
  const range = reportPeriodRange(period, from, to);
  const supabase = await createClient();
  const fromDate = range.fromDate;
  const toExclusive = range.to.slice(0, 10);
  const { data, error } = await supabase
    .from("expenses")
    .select("expense_date, description, amount, payment_method, category_id")
    .eq("business_id", session.businessId)
    .eq("status", "active")
    .gte("expense_date", fromDate)
    .lt("expense_date", toExclusive)
    .order("expense_date", { ascending: true })
    .limit(EXPORT_LIMIT);

  if (error || !data) {
    return { name: "Dépenses", headers: ["Date", "Description", "Catégorie", "Montant", "Paiement"], rows: [] };
  }

  const categoryIds = [...new Set(data.map((row) => row.category_id).filter((id): id is string => Boolean(id)))];
  const { data: categories } = categoryIds.length
    ? await supabase
        .from("expense_categories")
        .select("id, name")
        .eq("business_id", session.businessId)
        .in("id", categoryIds)
    : { data: [] as { id: string; name: string }[] };
  const names = new Map((categories ?? []).map((category) => [category.id, category.name]));

  return {
    name: "Dépenses",
    headers: ["Date", "Description", "Catégorie", "Montant", "Paiement"],
    rows: data.map((row) => [
      row.expense_date,
      row.description,
      row.category_id ? (names.get(row.category_id) ?? "Sans catégorie") : "Sans catégorie",
      asNumber(row.amount),
      paymentMethodLabel(row.payment_method),
    ]),
  };
}

async function exportPurchases(period: ReportPeriod, from?: string, to?: string): Promise<ExportSheet> {
  const session = await requireReportsSession();
  const range = reportPeriodRange(period, from, to);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchases")
    .select("purchase_number, purchase_date, total, amount_paid, amount_due, supplier_id")
    .eq("business_id", session.businessId)
    .eq("status", "completed")
    .gte("purchase_date", range.fromDate)
    .lt("purchase_date", range.to.slice(0, 10))
    .order("purchase_date", { ascending: true })
    .limit(EXPORT_LIMIT);

  if (error || !data) {
    return { name: "Achats", headers: ["Numéro", "Date", "Fournisseur", "Montant", "Payé", "Dette"], rows: [] };
  }

  const supplierIds = [...new Set(data.map((row) => row.supplier_id).filter((id): id is string => Boolean(id)))];
  const { data: suppliers } = supplierIds.length
    ? await supabase.from("suppliers").select("id, name").eq("business_id", session.businessId).in("id", supplierIds)
    : { data: [] as { id: string; name: string }[] };
  const names = new Map((suppliers ?? []).map((supplier) => [supplier.id, supplier.name]));

  return {
    name: "Achats",
    headers: ["Numéro", "Date", "Fournisseur", "Montant", "Payé", "Dette"],
    rows: data.map((row) => [
      row.purchase_number,
      row.purchase_date,
      row.supplier_id ? (names.get(row.supplier_id) ?? "Sans fournisseur") : "Sans fournisseur",
      asNumber(row.total),
      asNumber(row.amount_paid),
      asNumber(row.amount_due),
    ]),
  };
}
