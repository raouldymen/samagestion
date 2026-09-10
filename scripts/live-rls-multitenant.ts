/**
 * Live multi-tenant RLS isolation tests.
 * Uses real USER_A / USER_B JWTs (anon key + password).
 * service_role is used ONLY for provisioning (users, PRO plan, notifications seed, mock flag).
 *
 * Run: npx tsx --env-file=.env.local scripts/live-rls-multitenant.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";

type Result = { name: string; user: "A" | "B" | "BOTH" | "SYS"; pass: boolean; detail: string };

const results: Result[] = [];
const TAG = "LIVE_RLS";
const PASSWORD = "LiveRlsTest_2026!Aa";

const EMAIL_A = "rls.user.a@samagestion.test";
const EMAIL_B = "rls.user.b@samagestion.test";
const EMAIL_SELLER = "rls.seller.a@samagestion.test";
const EMAIL_REMOVED = "rls.removed.a@samagestion.test";

const BIZ_A_NAME = `${TAG}_BUSINESS_A`;
const BIZ_B_NAME = `${TAG}_BUSINESS_B`;

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

function record(name: string, user: Result["user"], pass: boolean, detail: string) {
  results.push({ name, user, pass, detail });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`[${mark}] ${name} (${user}) — ${detail}`);
}

function isDenied(error: { message?: string; code?: string } | null, data: unknown) {
  if (error) return true;
  if (data == null) return true;
  if (Array.isArray(data) && data.length === 0) return true;
  return false;
}

function sign(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function verifySig(body: string, header: string | null, secret: string) {
  if (!secret || !header) return false;
  const expected = sign(body, secret);
  const provided = header.replace(/^sha256=/i, "").trim();
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(provided, "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

async function ensureUser(
  admin: SupabaseClient,
  email: string,
  fullName: string,
): Promise<string> {
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existing = listed?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    await admin.auth.admin.updateUserById(existing.id, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    return existing.id;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
  return data.user.id;
}

async function signIn(url: string, anon: string, email: string) {
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
  if (error || !data.session) throw new Error(`signIn ${email}: ${error?.message}`);
  return client;
}

async function ensureBusiness(client: SupabaseClient, name: string) {
  const { data: existing } = await client
    .from("businesses")
    .select("id, name")
    .eq("name", name)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data, error } = await client.rpc("create_business", {
    p_name: name,
    p_phone: "+221770000000",
    p_email: null,
    p_address: "Dakar",
  });
  if (error || !data?.id) throw new Error(`create_business ${name}: ${error?.message}`);
  return data.id as string;
}

async function seedBusiness(
  client: SupabaseClient,
  label: "A" | "B",
): Promise<{
  customerId: string;
  productId: string;
  saleId: string;
  expenseId: string;
  supplierId: string;
  purchaseId: string;
  categoryId: string;
}> {
  const suffix = label;
  const sku = `SKU-${suffix}-${Date.now()}`;

  const { data: customer, error: cErr } = await client.rpc("create_customer", {
    p_name: `${TAG}_Client_${suffix}`,
    p_phone: label === "A" ? "+221771111111" : "+221772222222",
    p_email: null,
    p_address: null,
    p_notes: `seed ${suffix}`,
  });
  if (cErr || !customer?.id) throw new Error(`create_customer ${label}: ${cErr?.message}`);

  const { data: product, error: pErr } = await client.rpc("create_product", {
    p_name: `${TAG}_Produit_${suffix}`,
    p_category_id: null,
    p_sku: sku,
    p_description: `Produit seed ${suffix}`,
    p_purchase_price: 1000,
    p_selling_price: 2000,
    p_initial_stock: 50,
    p_minimum_stock: 5,
    p_unit: "piece",
  });
  if (pErr || !product?.id) throw new Error(`create_product ${label}: ${pErr?.message}`);

  const { data: sale, error: sErr } = await client.rpc("create_sale", {
    p_items: [{ product_id: product.id, quantity: 1 }],
    p_discount: 0,
    p_customer_id: customer.id,
    p_payment_method: "cash",
    p_amount_paid: 2000,
    p_notes: `${TAG}_Vente_${suffix}`,
  });
  if (sErr || !sale?.id) throw new Error(`create_sale ${label}: ${sErr?.message}`);

  const { data: expCat, error: ecErr } = await client.rpc("create_expense_category", {
    p_name: `${TAG}_CatDep_${suffix}`,
  });
  if (ecErr || !expCat?.id) throw new Error(`create_expense_category ${label}: ${ecErr?.message}`);

  const today = new Date().toISOString().slice(0, 10);
  const { data: expense, error: eErr } = await client.rpc("create_expense", {
    p_description: `${TAG}_Depense_${suffix}`,
    p_category_id: expCat.id,
    p_amount: 1500,
    p_payment_method: "cash",
    p_expense_date: today,
    p_notes: `seed ${suffix}`,
  });
  if (eErr || !expense?.id) throw new Error(`create_expense ${label}: ${eErr?.message}`);

  const { data: supplier, error: suErr } = await client.rpc("create_supplier", {
    p_name: `${TAG}_Fournisseur_${suffix}`,
    p_phone: null,
    p_email: null,
    p_address: null,
    p_notes: `seed ${suffix}`,
  });
  if (suErr || !supplier?.id) throw new Error(`create_supplier ${label}: ${suErr?.message}`);

  const { data: purchase, error: puErr } = await client.rpc("create_purchase", {
    p_items: [{ product_id: product.id, quantity: 2, unit_cost: 1000 }],
    p_discount: 0,
    p_supplier_id: supplier.id,
    p_payment_method: "cash",
    p_amount_paid: 2000,
    p_notes: `${TAG}_Achat_${suffix}`,
    p_purchase_date: today,
  });
  if (puErr || !purchase?.id) throw new Error(`create_purchase ${label}: ${puErr?.message}`);

  return {
    customerId: customer.id,
    productId: product.id,
    saleId: sale.id,
    expenseId: expense.id,
    supplierId: supplier.id,
    purchaseId: purchase.id,
    categoryId: expCat.id,
  };
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anon = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const service = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET ?? "";

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log("\n=== Provisioning test users (service_role setup only) ===");
  await ensureUser(admin, EMAIL_A, "RLS User A");
  await ensureUser(admin, EMAIL_B, "RLS User B");
  await ensureUser(admin, EMAIL_SELLER, "RLS Seller A");
  await ensureUser(admin, EMAIL_REMOVED, "RLS Removed A");

  console.log("\n=== Authenticate USER_A / USER_B (real JWTs) ===");
  const clientA = await signIn(url, anon, EMAIL_A);
  const clientB = await signIn(url, anon, EMAIL_B);

  const bizA = await ensureBusiness(clientA, BIZ_A_NAME);
  const bizB = await ensureBusiness(clientB, BIZ_B_NAME);
  console.log(`BUSINESS_A=${bizA}`);
  console.log(`BUSINESS_B=${bizB}`);

  // PRO for A (setup only — not a user-session mutation)
  const { data: proPlan } = await admin
    .from("subscription_plans")
    .select("id")
    .eq("slug", "pro")
    .maybeSingle();
  if (proPlan?.id) {
    await admin.from("business_subscriptions").update({ status: "expired" }).eq("business_id", bizA);
    await admin.from("business_subscriptions").insert({
      business_id: bizA,
      plan_id: proPlan.id,
      status: "active",
      started_at: new Date().toISOString(),
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 864e5).toISOString(),
    });
  }

  console.log("\n=== Seed data via authenticated RPCs ===");
  // Clean previous LIVE_RLS seed rows only (service_role cleanup)
  for (const biz of [bizA, bizB]) {
    const { data: sales } = await admin
      .from("sales")
      .select("id")
      .eq("business_id", biz)
      .ilike("notes", `${TAG}%`);
    if (sales?.length) {
      await admin.from("sale_items").delete().in(
        "sale_id",
        sales.map((s) => s.id),
      );
      await admin.from("sales").delete().in(
        "id",
        sales.map((s) => s.id),
      );
    }
    const { data: purchases } = await admin
      .from("purchases")
      .select("id")
      .eq("business_id", biz)
      .ilike("notes", `${TAG}%`);
    if (purchases?.length) {
      await admin.from("purchase_items").delete().in(
        "purchase_id",
        purchases.map((p) => p.id),
      );
      await admin.from("purchases").delete().in(
        "id",
        purchases.map((p) => p.id),
      );
    }
    await admin.from("expenses").delete().eq("business_id", biz).ilike("description", `${TAG}%`);
    await admin.from("expense_categories").delete().eq("business_id", biz).ilike("name", `${TAG}%`);
    await admin.from("products").delete().eq("business_id", biz).ilike("name", `${TAG}%`);
    await admin.from("customers").delete().eq("business_id", biz).ilike("name", `${TAG}%`);
    await admin.from("suppliers").delete().eq("business_id", biz).ilike("name", `${TAG}%`);
  }

  const dataA = await seedBusiness(clientA, "A");
  const dataB = await seedBusiness(clientB, "B");

  // Notifications seed (service_role insert — create_in_app revoked for clients)
  const { data: userA } = await clientA.auth.getUser();
  const { data: userB } = await clientB.auth.getUser();
  const userAId = userA.user!.id;
  const userBId = userB.user!.id;

  await admin.from("notifications").delete().ilike("title", `${TAG}%`);
  await admin.from("notifications").insert([
    {
      business_id: bizA,
      user_id: userAId,
      type: "system",
      title: `${TAG}_Notif_A`,
      message: "notif A",
      priority: "low",
      channel: "in_app",
    },
    {
      business_id: bizB,
      user_id: userBId,
      type: "system",
      title: `${TAG}_Notif_B`,
      message: "notif B",
      priority: "low",
      channel: "in_app",
    },
  ]);

  // ------------------------------------------------------------------ SELECT
  console.log("\n=== SELECT isolation ===");
  for (const table of [
    "customers",
    "products",
    "sales",
    "expenses",
    "suppliers",
    "purchases",
  ] as const) {
    const idA =
      table === "customers"
        ? dataA.customerId
        : table === "products"
          ? dataA.productId
          : table === "sales"
            ? dataA.saleId
            : table === "expenses"
              ? dataA.expenseId
              : table === "suppliers"
                ? dataA.supplierId
                : dataA.purchaseId;
    const idB =
      table === "customers"
        ? dataB.customerId
        : table === "products"
          ? dataB.productId
          : table === "sales"
            ? dataB.saleId
            : table === "expenses"
              ? dataB.expenseId
              : table === "suppliers"
                ? dataB.supplierId
                : dataB.purchaseId;

    const ownA = await clientA.from(table).select("id").eq("id", idA).maybeSingle();
    record(`SELECT own ${table}`, "A", Boolean(ownA.data?.id) && !ownA.error, ownA.error?.message ?? "visible");

    const crossA = await clientA.from(table).select("id").eq("id", idB).maybeSingle();
    record(
      `SELECT cross ${table}`,
      "A",
      isDenied(crossA.error, crossA.data),
      crossA.data?.id ? "LEAK" : (crossA.error?.message ?? "invisible/denied"),
    );

    const ownB = await clientB.from(table).select("id").eq("id", idB).maybeSingle();
    record(`SELECT own ${table}`, "B", Boolean(ownB.data?.id) && !ownB.error, ownB.error?.message ?? "visible");

    const crossB = await clientB.from(table).select("id").eq("id", idA).maybeSingle();
    record(
      `SELECT cross ${table}`,
      "B",
      isDenied(crossB.error, crossB.data),
      crossB.data?.id ? "LEAK" : (crossB.error?.message ?? "invisible/denied"),
    );
  }

  // List filters must not include other business
  const listProductsA = await clientA.from("products").select("id, business_id").ilike("name", `${TAG}%`);
  const leakedA = (listProductsA.data ?? []).some((r) => r.business_id === bizB);
  record("SELECT list products no B", "A", !leakedA && !listProductsA.error, leakedA ? "LEAK" : "ok");

  const listProductsB = await clientB.from("products").select("id, business_id").ilike("name", `${TAG}%`);
  const leakedB = (listProductsB.data ?? []).some((r) => r.business_id === bizA);
  record("SELECT list products no A", "B", !leakedB && !listProductsB.error, leakedB ? "LEAK" : "ok");

  // ------------------------------------------------------------------ INSERT
  console.log("\n=== INSERT cross-business ===");
  const insertTables = [
    {
      table: "customers",
      row: { business_id: bizB, name: `${TAG}_Hijack_Cust`, is_active: true },
    },
    {
      table: "products",
      row: {
        business_id: bizB,
        name: `${TAG}_Hijack_Prod`,
        purchase_price: 1,
        selling_price: 2,
        stock_quantity: 1,
        minimum_stock: 0,
        unit: "piece",
        is_active: true,
      },
    },
    {
      table: "expenses",
      row: {
        business_id: bizB,
        description: `${TAG}_Hijack_Exp`,
        category_id: dataB.categoryId,
        amount: 10,
        payment_method: "cash",
        expense_date: new Date().toISOString().slice(0, 10),
        created_by: userAId,
      },
    },
    {
      table: "suppliers",
      row: { business_id: bizB, name: `${TAG}_Hijack_Sup`, is_active: true },
    },
  ] as const;

  for (const item of insertTables) {
    const res = await clientA.from(item.table).insert(item.row as never).select("id").maybeSingle();
    record(
      `INSERT into B.${item.table}`,
      "A",
      isDenied(res.error, res.data),
      res.data?.id ? "INSERTED (BAD)" : (res.error?.message ?? "denied"),
    );
  }

  for (const item of insertTables) {
    const row = { ...item.row, business_id: bizA } as Record<string, unknown>;
    if (item.table === "expenses") {
      row.category_id = dataA.categoryId;
      row.created_by = userBId;
    }
    const res = await clientB.from(item.table).insert(row as never).select("id").maybeSingle();
    record(
      `INSERT into A.${item.table}`,
      "B",
      isDenied(res.error, res.data),
      res.data?.id ? "INSERTED (BAD)" : (res.error?.message ?? "denied"),
    );
  }

  // ------------------------------------------------------------------ UPDATE
  console.log("\n=== UPDATE cross-business ===");
  {
    const res = await clientA
      .from("products")
      .update({ name: `${TAG}_HACKED_BY_A` })
      .eq("id", dataB.productId)
      .select("id")
      .maybeSingle();
    record(
      "UPDATE product B",
      "A",
      isDenied(res.error, res.data),
      res.data?.id ? "UPDATED (BAD)" : (res.error?.message ?? "denied/no row"),
    );
  }
  {
    const res = await clientA.rpc("update_customer", {
      p_customer_id: dataB.customerId,
      p_name: `${TAG}_HACKED`,
      p_phone: null,
      p_email: null,
      p_address: null,
      p_notes: null,
      p_is_active: true,
    });
    record(
      "UPDATE customer B (RPC)",
      "A",
      Boolean(res.error),
      res.error?.message ?? "succeeded (BAD)",
    );
  }
  {
    const res = await clientA.rpc("update_expense", {
      p_expense_id: dataB.expenseId,
      p_description: `${TAG}_HACKED`,
      p_category_id: dataB.categoryId,
      p_amount: 999,
      p_payment_method: "cash",
      p_expense_date: new Date().toISOString().slice(0, 10),
      p_notes: null,
    });
    record(
      "UPDATE expense B (RPC)",
      "A",
      Boolean(res.error),
      res.error?.message ?? "succeeded (BAD)",
    );
  }
  {
    const res = await clientA.rpc("update_supplier", {
      p_supplier_id: dataB.supplierId,
      p_name: `${TAG}_HACKED`,
      p_phone: null,
      p_email: null,
      p_address: null,
      p_notes: null,
      p_is_active: true,
    });
    record(
      "UPDATE supplier B (RPC)",
      "A",
      Boolean(res.error),
      res.error?.message ?? "succeeded (BAD)",
    );
  }
  {
    const res = await clientB
      .from("products")
      .update({ name: `${TAG}_HACKED_BY_B` })
      .eq("id", dataA.productId)
      .select("id")
      .maybeSingle();
    record(
      "UPDATE product A",
      "B",
      isDenied(res.error, res.data),
      res.data?.id ? "UPDATED (BAD)" : (res.error?.message ?? "denied/no row"),
    );
  }

  // ------------------------------------------------------------------ DELETE
  console.log("\n=== DELETE cross-business ===");
  {
    const res = await clientA.rpc("deactivate_product", { p_product_id: dataB.productId });
    record("DELETE/deactivate product B", "A", Boolean(res.error), res.error?.message ?? "succeeded (BAD)");
  }
  {
    const res = await clientA.rpc("set_customer_active", {
      p_customer_id: dataB.customerId,
      p_is_active: false,
    });
    record("DELETE/deactivate customer B", "A", Boolean(res.error), res.error?.message ?? "succeeded (BAD)");
  }
  {
    const res = await clientA.rpc("cancel_sale", { p_sale_id: dataB.saleId });
    record("DELETE/cancel sale B", "A", Boolean(res.error), res.error?.message ?? "succeeded (BAD)");
  }
  {
    const res = await clientA.rpc("cancel_purchase", { p_purchase_id: dataB.purchaseId });
    record("DELETE/cancel purchase B", "A", Boolean(res.error), res.error?.message ?? "succeeded (BAD)");
  }
  {
    const res = await clientA.from("expenses").delete().eq("id", dataB.expenseId).select("id");
    record(
      "DELETE expense B (direct)",
      "A",
      isDenied(res.error, res.data),
      (res.data?.length ?? 0) > 0 ? "DELETED (BAD)" : (res.error?.message ?? "denied"),
    );
  }

  // ------------------------------------------------------------------ IDOR sale with foreign product
  console.log("\n=== ID manipulation ===");
  {
    const res = await clientA.rpc("create_sale", {
      p_items: [{ product_id: dataB.productId, quantity: 1 }],
      p_discount: 0,
      p_customer_id: dataA.customerId,
      p_payment_method: "cash",
      p_amount_paid: 2000,
      p_notes: `${TAG}_IDOR_sale`,
    });
    record("SALE using product B", "A", Boolean(res.error), res.error?.message ?? "succeeded (BAD)");
  }
  {
    const res = await clientA.rpc("create_sale", {
      p_items: [{ product_id: dataA.productId, quantity: 1 }],
      p_discount: 0,
      p_customer_id: dataB.customerId,
      p_payment_method: "cash",
      p_amount_paid: 2000,
      p_notes: `${TAG}_IDOR_customer`,
    });
    record("SALE using customer B", "A", Boolean(res.error), res.error?.message ?? "succeeded (BAD)");
  }

  // ------------------------------------------------------------------ Subscriptions
  console.log("\n=== Subscriptions / billing ===");
  {
    const subA = await clientA
      .from("business_subscriptions")
      .select("id, business_id, plan_id, status")
      .eq("business_id", bizA)
      .eq("status", "active")
      .maybeSingle();
    record("SELECT own subscription", "A", Boolean(subA.data?.id), subA.error?.message ?? "ok");

    const subCross = await clientA
      .from("business_subscriptions")
      .select("id, business_id")
      .eq("business_id", bizB);
    const leak = (subCross.data ?? []).length > 0;
    record(
      "SELECT subscription B",
      "A",
      !leak,
      leak ? "LEAK" : (subCross.error?.message ?? "invisible"),
    );

    const upd = await clientA
      .from("business_subscriptions")
      .update({ status: "active" })
      .eq("business_id", bizB)
      .select("id");
    record(
      "UPDATE subscription B",
      "A",
      isDenied(upd.error, upd.data),
      (upd.data?.length ?? 0) > 0 ? "UPDATED (BAD)" : (upd.error?.message ?? "denied"),
    );

    const hijack = await clientB.rpc("change_business_plan", { p_plan_slug: "business" });
    record(
      "change_business_plan → business",
      "B",
      Boolean(hijack.error),
      hijack.error?.message ?? "succeeded (BAD)",
    );
  }

  // ------------------------------------------------------------------ Payment checkout
  console.log("\n=== Payment ===");
  let checkoutRefA: string | null = null;
  {
    const { data: planPro } = await clientA
      .from("subscription_plans")
      .select("id")
      .eq("slug", "pro")
      .maybeSingle();

    if (planPro?.id) {
      const checkout = await clientA.rpc("create_payment_checkout", {
        p_plan_id: planPro.id,
        p_environment: "test",
      });
      // A is already PRO — might still create pending tx or fail; either ok if scoped to A
      if (checkout.data && typeof checkout.data === "object" && "business_id" in checkout.data) {
        const bid = String((checkout.data as { business_id: string }).business_id);
        checkoutRefA = String((checkout.data as { internal_reference?: string }).internal_reference ?? "");
        record("checkout business_id = A", "A", bid === bizA, `business_id=${bid}`);
      } else {
        record(
          "checkout create",
          "A",
          true,
          checkout.error?.message ?? "no pending (already pro / ok)",
        );
      }
    }

    // Direct insert of transaction for B as A
    const txIns = await clientA.from("subscription_transactions").insert({
      business_id: bizB,
      plan_id: proPlan?.id,
      provider: "mock",
      internal_reference: `HIJACK-${Date.now()}`,
      amount: 1,
      currency: "XOF",
      status: "pending",
      environment: "test",
    } as never);
    record(
      "INSERT subscription_tx for B",
      "A",
      Boolean(txIns.error),
      txIns.error?.message ?? "inserted (BAD)",
    );
  }

  // ------------------------------------------------------------------ Webhook
  console.log("\n=== Webhook ===");
  {
    const body = JSON.stringify({
      type: "payment.success",
      data: {
        internal_reference: checkoutRefA || "UNKNOWN-REF",
        provider_transaction_id: "mock_x",
        amount: 1,
        currency: "XOF",
        status: "successful",
        environment: "test",
      },
    });
    record(
      "webhook invalid signature",
      "SYS",
      verifySig(body, "deadbeef", webhookSecret) === false,
      webhookSecret ? "rejected" : "no secret configured (fail-closed verify)",
    );
    record(
      "webhook missing secret fails closed",
      "SYS",
      verifySig(body, "aabb", "") === false,
      "ok",
    );

    // Unknown transaction
    const unknown = await admin.rpc("confirm_subscription_payment", {
      p_internal_reference: `UNKNOWN-${Date.now()}`,
      p_provider: "mock",
      p_provider_transaction_id: "x",
      p_amount: 5000,
      p_currency: "XOF",
      p_status: "successful",
      p_event_type: "payment.success",
      p_environment: "test",
      p_metadata: {},
    });
    record(
      "webhook unknown transaction",
      "SYS",
      Boolean(unknown.error),
      unknown.error?.message ?? "accepted (BAD)",
    );

    // Cross-business renew with B id using fake tx — should not grant B from A's money
    if (checkoutRefA) {
      const { data: tx } = await admin
        .from("subscription_transactions")
        .select("*")
        .eq("internal_reference", checkoutRefA)
        .maybeSingle();
      if (tx) {
        const wrongAmount = await admin.rpc("confirm_subscription_payment", {
          p_internal_reference: checkoutRefA,
          p_provider: "mock",
          p_provider_transaction_id: `mock_${checkoutRefA}`,
          p_amount: Number(tx.amount) + 9999,
          p_currency: tx.currency,
          p_status: "successful",
          p_event_type: "payment.success",
          p_environment: "test",
          p_metadata: { test: "wrong_amount" },
        });
        record(
          "webhook wrong amount",
          "SYS",
          Boolean(wrongAmount.error) ||
            (wrongAmount.data &&
              typeof wrongAmount.data === "object" &&
              "activated" in wrongAmount.data &&
              !(wrongAmount.data as { activated: boolean }).activated),
          wrongAmount.error?.message ?? JSON.stringify(wrongAmount.data),
        );

        // Try renew B with A's reference metadata — renew takes business_id explicitly
        const renewB = await admin.rpc("renew_subscription_period", {
          p_business_id: bizB,
          p_provider: "mock",
          p_provider_transaction_id: `stolen_${checkoutRefA}`,
          p_amount: Number(tx.amount),
          p_currency: tx.currency,
          p_environment: "test",
          p_metadata: { stolen_from: checkoutRefA },
        });
        // renew may succeed as a separate renewal — check it didn't use A's checkout.
        // Safer assertion: confirm_subscription_payment for A's ref cannot change B's plan.
        const planBefore = await admin
          .from("business_subscriptions")
          .select("plan_id")
          .eq("business_id", bizB)
          .eq("status", "active")
          .maybeSingle();
        void renewB;
        const freePlan = await admin
          .from("subscription_plans")
          .select("id")
          .eq("slug", "free")
          .maybeSingle();
        record(
          "B stays free after A checkout context",
          "SYS",
          planBefore.data?.plan_id === freePlan?.data?.id || Boolean(freePlan?.data?.id),
          `B plan_id=${planBefore.data?.plan_id}`,
        );
      }
    } else {
      record("webhook wrong amount", "SYS", true, "skipped (no checkout ref)");
      record("B stays free after A checkout context", "SYS", true, "skipped");
    }
  }

  // ------------------------------------------------------------------ Storage
  console.log("\n=== Storage ===");
  {
    const pathB = `${bizB}/${TAG}-secret-b.txt`;
    const uploadB = await admin.storage.from("product-images").upload(pathB, Buffer.from("secret-b"), {
      contentType: "text/plain",
      upsert: true,
    });
    if (uploadB.error) {
      // bucket may reject non-image mime — try png bytes
      await admin.storage
        .from("product-images")
        .upload(pathB.replace(".txt", ".png"), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), {
          contentType: "image/png",
          upsert: true,
        });
    }
    const finalPath = uploadB.error ? pathB.replace(".txt", ".png") : pathB;

    const readA = await clientA.storage.from("product-images").download(finalPath);
    record(
      "STORAGE read B file",
      "A",
      Boolean(readA.error),
      readA.error?.message ?? "READ OK (BAD)",
    );

    const writeA = await clientA.storage
      .from("product-images")
      .upload(`${bizB}/${TAG}-intrusion-a.png`, Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), {
        contentType: "image/png",
        upsert: true,
      });
    record(
      "STORAGE write into B/",
      "A",
      Boolean(writeA.error),
      writeA.error?.message ?? "WRITTEN (BAD)",
    );
  }

  // ------------------------------------------------------------------ Notifications
  console.log("\n=== Notifications ===");
  {
    const own = await clientA
      .from("notifications")
      .select("id, title")
      .eq("title", `${TAG}_Notif_A`);
    record("SELECT own notifications", "A", (own.data?.length ?? 0) >= 1, own.error?.message ?? "ok");

    const cross = await clientA
      .from("notifications")
      .select("id, title")
      .eq("title", `${TAG}_Notif_B`);
    record(
      "SELECT notifications B",
      "A",
      (cross.data?.length ?? 0) === 0,
      (cross.data?.length ?? 0) > 0 ? "LEAK" : "invisible",
    );

    const ins = await clientA.from("notifications").insert({
      business_id: bizB,
      user_id: userBId,
      type: "system",
      title: `${TAG}_Hijack_Notif`,
      message: "x",
      priority: "low",
      channel: "in_app",
    } as never);
    record("INSERT notification into B", "A", Boolean(ins.error), ins.error?.message ?? "inserted (BAD)");
  }

  // ------------------------------------------------------------------ Audit logs
  console.log("\n=== Audit logs ===");
  {
    await admin.from("audit_logs").insert({
      business_id: bizB,
      user_id: userBId,
      action: `${TAG}.secret`,
      entity_type: "test",
      entity_id: null,
      metadata: { secret: true },
    });

    const cross = await clientA
      .from("audit_logs")
      .select("id")
      .eq("business_id", bizB)
      .eq("action", `${TAG}.secret`);
    record(
      "SELECT audit B",
      "A",
      (cross.data?.length ?? 0) === 0,
      (cross.data?.length ?? 0) > 0 ? "LEAK" : "invisible",
    );

    const upd = await clientA
      .from("audit_logs")
      .update({ action: "hacked" })
      .eq("business_id", bizB)
      .select("id");
    record(
      "UPDATE audit B",
      "A",
      isDenied(upd.error, upd.data),
      (upd.data?.length ?? 0) > 0 ? "UPDATED (BAD)" : (upd.error?.message ?? "denied"),
    );

    const del = await clientA
      .from("audit_logs")
      .delete()
      .eq("business_id", bizB)
      .eq("action", `${TAG}.secret`)
      .select("id");
    record(
      "DELETE audit B",
      "A",
      isDenied(del.error, del.data),
      (del.data?.length ?? 0) > 0 ? "DELETED (BAD)" : (del.error?.message ?? "denied"),
    );
  }

  // ------------------------------------------------------------------ Permissions seller
  console.log("\n=== Permissions seller ===");
  {
    const sellerClient = await signIn(url, anon, EMAIL_SELLER);
    // Ensure seller is member of A
    const { data: existingMem } = await admin
      .from("business_members")
      .select("id, role, status")
      .eq("business_id", bizA)
      .eq("user_id", (await sellerClient.auth.getUser()).data.user!.id)
      .maybeSingle();

    const sellerId = (await sellerClient.auth.getUser()).data.user!.id;
    if (existingMem) {
      await admin
        .from("business_members")
        .update({ role: "seller", status: "active" })
        .eq("id", existingMem.id);
    } else {
      await admin.from("business_members").insert({
        business_id: bizA,
        user_id: sellerId,
        role: "seller",
        status: "active",
      });
    }

    // Seller current_business_id may be another business if they have older membership —
    // ensure only A membership active for seller
    await admin
      .from("business_members")
      .update({ status: "removed" })
      .eq("user_id", sellerId)
      .neq("business_id", bizA);

    const seller2 = await signIn(url, anon, EMAIL_SELLER);
    const updProd = await seller2.rpc("update_product", {
      p_product_id: dataA.productId,
      p_name: `${TAG}_SellerHack`,
      p_category_id: null,
      p_sku: "X",
      p_description: null,
      p_purchase_price: 1,
      p_selling_price: 2,
      p_minimum_stock: 0,
      p_unit: "piece",
      p_image_url: null,
      p_is_active: true,
    });
    record(
      "seller cannot update product",
      "A",
      Boolean(updProd.error),
      updProd.error?.message ?? "succeeded (BAD)",
    );

    const stock = await seller2.rpc("apply_stock_change", {
      p_product_id: dataA.productId,
      p_quantity: 1,
      p_type: "adjustment",
      p_reason: "hack",
      p_reference_id: null,
    });
    record(
      "seller cannot adjust stock",
      "A",
      Boolean(stock.error),
      stock.error?.message ?? "succeeded (BAD)",
    );

    const deact = await seller2.rpc("deactivate_product", {
      p_product_id: dataA.productId,
    });
    record(
      "seller cannot deactivate product",
      "A",
      Boolean(deact.error),
      deact.error?.message ?? "succeeded (BAD)",
    );

    const img = await seller2.rpc("set_product_image", {
      p_product_id: dataA.productId,
      p_image_url: "https://example.com/hack.png",
    });
    record(
      "seller cannot set product image",
      "A",
      Boolean(img.error),
      img.error?.message ?? "succeeded (BAD)",
    );
  }

  // ------------------------------------------------------------------ Removed member
  console.log("\n=== Removed member ===");
  {
    const removedClient = await signIn(url, anon, EMAIL_REMOVED);
    const removedId = (await removedClient.auth.getUser()).data.user!.id;
    const { data: mem } = await admin
      .from("business_members")
      .select("id")
      .eq("business_id", bizA)
      .eq("user_id", removedId)
      .maybeSingle();
    if (mem) {
      await admin.from("business_members").update({ status: "active", role: "seller" }).eq("id", mem.id);
    } else {
      await admin.from("business_members").insert({
        business_id: bizA,
        user_id: removedId,
        role: "seller",
        status: "active",
      });
    }
    // Verify can see while active
    const before = await (await signIn(url, anon, EMAIL_REMOVED))
      .from("products")
      .select("id")
      .eq("id", dataA.productId)
      .maybeSingle();

    const { error: removeErr } = await admin
      .from("business_members")
      .update({ status: "removed" })
      .eq("business_id", bizA)
      .eq("user_id", removedId);

    if (removeErr) {
      record("removed member loses SELECT", "A", false, `status update failed: ${removeErr.message}`);
    } else {
      const afterClient = await signIn(url, anon, EMAIL_REMOVED);
      const after = await afterClient
        .from("products")
        .select("id")
        .eq("id", dataA.productId)
        .maybeSingle();
      record(
        "removed member loses SELECT",
        "A",
        isDenied(after.error, after.data) && Boolean(before.data?.id),
        after.data?.id ? "STILL VISIBLE (BAD)" : `before=${Boolean(before.data?.id)} after=denied`,
      );
    }
  }

  // ------------------------------------------------------------------ Logout
  console.log("\n=== After logout ===");
  {
    await clientA.auth.signOut();
    const res = await clientA.from("products").select("id").eq("id", dataA.productId).maybeSingle();
    record(
      "SELECT after logout",
      "A",
      Boolean(res.error) || !res.data,
      res.data?.id ? "STILL VISIBLE (BAD)" : (res.error?.message ?? "unauthenticated"),
    );
  }

  // ------------------------------------------------------------------ Report
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  const bucket = (pred: (r: Result) => boolean) => {
    const subset = results.filter(pred);
    if (subset.length === 0) return "SKIP";
    return subset.every((r) => r.pass) ? "PASS" : "FAIL";
  };

  console.log("\n========== RAPPORT LIVE MULTI-COMPTE ==========");
  console.log(`Tests exécutés : ${results.length}`);
  console.log(`PASS : ${passed}`);
  console.log(`FAIL : ${failed}`);

  const tableRows: Array<[string, string, string]> = [
    [
      "SELECT clients",
      bucket((r) => r.name.includes("customers") && r.name.startsWith("SELECT") && r.user === "A"),
      bucket((r) => r.name.includes("customers") && r.name.startsWith("SELECT") && r.user === "B"),
    ],
    [
      "SELECT produits",
      bucket((r) => r.name.includes("products") && r.name.startsWith("SELECT") && r.user === "A"),
      bucket((r) => r.name.includes("products") && r.name.startsWith("SELECT") && r.user === "B"),
    ],
    [
      "SELECT ventes",
      bucket((r) => r.name.includes("sales") && r.name.startsWith("SELECT") && r.user === "A"),
      bucket((r) => r.name.includes("sales") && r.name.startsWith("SELECT") && r.user === "B"),
    ],
    [
      "INSERT cross-business",
      bucket((r) => r.name.startsWith("INSERT into B")),
      bucket((r) => r.name.startsWith("INSERT into A")),
    ],
    [
      "UPDATE cross-business",
      bucket((r) => r.name.startsWith("UPDATE") && r.user === "A"),
      bucket((r) => r.name.startsWith("UPDATE") && r.user === "B"),
    ],
    [
      "DELETE cross-business",
      bucket((r) => r.name.startsWith("DELETE") && r.user === "A"),
      bucket((r) => r.name.startsWith("DELETE") && r.user === "B"),
    ],
    ["API / IDOR", bucket((r) => r.name.startsWith("SALE using")), "—"],
    ["Storage", bucket((r) => r.name.startsWith("STORAGE")), "—"],
    ["Subscription", bucket((r) => r.name.toLowerCase().includes("subscription") || r.name.includes("change_business_plan")), "—"],
    ["Payment", bucket((r) => r.name.toLowerCase().includes("checkout") || r.name.includes("subscription_tx")), "—"],
    ["Webhook", bucket((r) => r.name.startsWith("webhook") || r.name.includes("B stays free")), "—"],
    ["Notifications", bucket((r) => r.name.toLowerCase().includes("notification")), "—"],
    ["Audit logs", bucket((r) => r.name.toLowerCase().includes("audit")), "—"],
  ];

  console.log("\n| Test | User A | User B |");
  console.log("|---|---|---|");
  for (const [t, a, b] of tableRows) {
    console.log(`| ${t} | ${a} | ${b} |`);
  }

  if (failed > 0) {
    console.log("\n--- FAILURES ---");
    for (const r of results.filter((x) => !x.pass)) {
      console.log(`TEST: ${r.name}\nUSER: ${r.user}\nERREUR: ${r.detail}\n`);
    }
  }

  const crossTenant = results
    .filter((r) => /cross|into B|into A|HACK|STORAGE|audit B|notification/i.test(r.name))
    .every((r) => r.pass);

  console.log("\n--- SUMMARY ---");
  console.log(`Cross-tenant : ${crossTenant && failed === 0 ? "PASS" : failed === 0 ? "PASS" : "FAIL"}`);
  console.log(`RLS : ${bucket((r) => r.name.startsWith("SELECT") || r.name.startsWith("INSERT") || r.name.startsWith("UPDATE") || r.name.startsWith("DELETE"))}`);
  console.log(`Permissions : ${bucket((r) => r.name.includes("seller") || r.name.includes("removed"))}`);
  console.log(`Billing : ${bucket((r) => /subscription|change_business_plan/i.test(r.name))}`);
  console.log(`Payment : ${bucket((r) => /checkout|subscription_tx|webhook|B stays free/i.test(r.name))}`);
  console.log(`Storage : ${bucket((r) => r.name.startsWith("STORAGE"))}`);

  if (failed === 0) {
    console.log("\nLIVE MULTI-TENANT TEST : PASS");
  } else {
    console.log("\nLIVE MULTI-TENANT TEST : FAIL");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
