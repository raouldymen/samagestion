import { createServiceClient } from "@/lib/payments/service-client";
import type { User } from "@supabase/supabase-js";

type ProvisionResult = {
  user: User;
  created: boolean;
};

function isAlreadyRegistered(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("already registered") ||
    lower.includes("already been registered") ||
    lower.includes("user already") ||
    lower.includes("email_exists") ||
    lower.includes("already exists")
  );
}

async function findAuthUserByEmail(email: string): Promise<User | null> {
  const admin = createServiceClient();

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });

    if (error) {
      throw error;
    }

    const found = data.users.find((user) => user.email?.toLowerCase() === email);
    if (found) {
      return found;
    }

    if (data.users.length < 200) {
      break;
    }
  }

  return null;
}

export async function provisionMemberAuthUser(input: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<ProvisionResult> {
  const admin = createServiceClient();
  const fullName = input.fullName?.trim() || undefined;

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: fullName ? { full_name: fullName } : {},
  });

  if (data.user && !error) {
    return { user: data.user, created: true };
  }

  if (error && isAlreadyRegistered(error.message)) {
    const existing = await findAuthUserByEmail(input.email);
    if (existing) {
      return { user: existing, created: false };
    }
  }

  throw error ?? new Error("MEMBER_NOT_FOUND");
}
