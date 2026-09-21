/**
 * Diagnostic super admin — n'affiche pas de secrets.
 *   npx tsx --env-file=.env.local scripts/check-platform-admin.ts
 */
import { createClient } from "@supabase/supabase-js";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = (process.env.PLATFORM_ADMIN_EMAIL ?? "raouldymen@gmail.com").trim().toLowerCase();

  if (!url || !service || !anon) {
    throw new Error("MISSING_ENV");
  }

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) {
    throw new Error(listError.message);
  }

  const user = listed.users.find((item) => item.email?.toLowerCase() === email);
  console.log(`user_found=${Boolean(user)}`);
  console.log(`user_confirmed=${user?.email_confirmed_at ? "yes" : "no"}`);
  console.log(`user_banned=${user?.banned_until ? "yes" : "no"}`);

  const { data: rows, error: tableError } = await admin.from("platform_admins").select("user_id");
  console.log(`table_error=${tableError?.message ?? "none"}`);
  console.log(`admin_rows=${rows?.length ?? 0}`);
  console.log(`email_in_allowlist=${user ? Boolean(rows?.some((row) => row.user_id === user.id)) : false}`);

  const { error: rpcAsService } = await admin.rpc("is_platform_admin");
  console.log(`rpc_as_service_error=${rpcAsService?.message ?? "none"}`);
  console.log(`rpc_as_service_value=${String((await admin.rpc("is_platform_admin")).data)}`);

  const anonClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: rpcAnon } = await anonClient.rpc("is_platform_admin");
  console.log(`rpc_as_anon_error=${rpcAnon?.message ?? "none"}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "FAILED");
  process.exit(1);
});
