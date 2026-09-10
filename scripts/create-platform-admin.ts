/**
 * Crée (ou réutilise) un compte Auth et l'inscrit dans platform_admins.
 *
 *   npx tsx --env-file=.env.local scripts/create-platform-admin.ts
 *   PLATFORM_ADMIN_EMAIL=toi@exemple.com npx tsx --env-file=.env.local scripts/create-platform-admin.ts
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function generatePassword() {
  return `${randomBytes(18).toString("base64url")}Aa1!`;
}

async function main() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const service = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const email = (process.env.PLATFORM_ADMIN_EMAIL ?? "admin@samagestion.app").trim().toLowerCase();
  const providedPassword = process.env.PLATFORM_ADMIN_PASSWORD?.trim() || "";

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: listed, error: listError } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listError) {
    throw new Error(listError.message);
  }

  const existing = listed.users.find((user) => user.email?.toLowerCase() === email);
  let userId = existing?.id ?? "";
  let password = providedPassword;
  let created = false;

  if (!userId) {
    password = providedPassword || generatePassword();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Super admin" },
    });
    if (error || !data.user) {
      throw new Error(error?.message ?? "CREATE_USER_FAILED");
    }
    userId = data.user.id;
    created = true;
  } else if (providedPassword) {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: providedPassword,
      email_confirm: true,
    });
    if (error) {
      throw new Error(error.message);
    }
    password = providedPassword;
  }

  const { error: insertError } = await admin.from("platform_admins").upsert(
    {
      user_id: userId,
      notes: "Administrateur initial",
    },
    { onConflict: "user_id" },
  );

  if (insertError) {
    throw new Error(insertError.message);
  }

  console.log("PLATFORM_ADMIN_READY");
  console.log(`email=${email}`);
  console.log(`user_id=${userId}`);
  console.log(`created=${created ? "yes" : "no"}`);
  if (password) {
    console.log(`password=${password}`);
  } else {
    console.log("password=(inchangé — compte existant)");
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "FAILED";
  console.error(message);
  process.exit(1);
});
