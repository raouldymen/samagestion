import { requireBusinessSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type { Customer, CustomerDetail, CustomerListItem } from "@/types/customers";

function asNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asRecord(value: Json | undefined): Record<string, Json | undefined> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  return {};
}

function mapCustomer(row: Record<string, Json | undefined>): Customer {
  return {
    id: String(row.id ?? ""),
    businessId: String(row.business_id ?? ""),
    name: String(row.name ?? ""),
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    address: row.address ? String(row.address) : null,
    notes: row.notes ? String(row.notes) : null,
    isActive: row.is_active !== false,
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export async function listCustomersWithStats(options?: {
  q?: string;
  includeArchived?: boolean;
}): Promise<{ items: CustomerListItem[]; error: string | null }> {
  await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_customers_with_stats", {
    p_search: options?.q?.trim() || null,
    p_include_archived: Boolean(options?.includeArchived),
  });

  if (error) {
    return { items: [], error: "Impossible de charger les clients." };
  }

  const list = Array.isArray(data) ? data : [];
  return {
    error: null,
    items: list.map((item) => {
      const row = asRecord(item as Json);
      return {
        ...mapCustomer(row),
        salesCount: asNumber(row.sales_count),
        totalPurchased: asNumber(row.total_purchased),
        totalPaid: asNumber(row.total_paid),
        amountDue: asNumber(row.amount_due),
      };
    }),
  };
}

/** Liste légère pour le picker de vente (clients actifs uniquement). */
export async function listActiveCustomers(): Promise<Customer[]> {
  const session = await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, business_id, name, phone, email, address, notes, is_active, created_at, updated_at",
    )
    .eq("business_id", session.businessId)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(200);

  if (error || !data) {
    return [];
  }

  return data.map((row) => mapCustomer(row as unknown as Record<string, Json | undefined>));
}

export async function getCustomerDetail(
  customerId: string,
): Promise<CustomerDetail | null> {
  await requireBusinessSession();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_customer_detail", {
    p_customer_id: customerId,
  });

  if (error || data == null) {
    return null;
  }

  const root = asRecord(data as Json);
  const customer = mapCustomer(asRecord(root.customer));
  const stats = asRecord(root.stats);
  const salesRaw = Array.isArray(root.sales) ? root.sales : [];

  return {
    customer,
    stats: {
      salesCount: asNumber(stats.sales_count),
      totalPurchased: asNumber(stats.total_purchased),
      totalPaid: asNumber(stats.total_paid),
      amountDue: asNumber(stats.amount_due),
    },
    sales: salesRaw.map((item) => {
      const row = asRecord(item as Json);
      return {
        id: String(row.id ?? ""),
        saleNumber: String(row.sale_number ?? ""),
        total: asNumber(row.total),
        amountPaid: asNumber(row.amount_paid),
        amountDue: asNumber(row.amount_due),
        paymentStatus: String(row.payment_status ?? ""),
        createdAt: String(row.created_at ?? ""),
      };
    }),
  };
}
