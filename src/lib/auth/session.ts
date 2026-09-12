import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isUserPlatformAdmin } from "@/lib/admin/access";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { resolveAuthOrigin } from "@/lib/auth/origin";
import type { AppUser, Business, CurrentSession } from "@/types";
import type { BusinessRole, Database, MemberStatus } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";

type TypedClient = SupabaseClient<Database>;

export type MembershipLookup =
  | { kind: "active"; role: BusinessRole; business: Business }
  | { kind: "suspended"; business: Business }
  | null;

function mapBusiness(
  row: Database["public"]["Tables"]["businesses"]["Row"],
): Business {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    country: row.country,
    logoUrl: row.logo_url,
    currency: row.currency,
    ownerId: row.owner_id,
  };
}

function isBusinessRole(role: string): role is BusinessRole {
  return (
    role === "owner" ||
    role === "manager" ||
    role === "cashier" ||
    role === "seller" ||
    role === "stock_manager"
  );
}

function isMemberStatus(value: string): value is MemberStatus {
  return value === "active" || value === "invited" || value === "suspended";
}

export async function getRequestOrigin() {
  const headerStore = await headers();
  return resolveAuthOrigin({
    origin: headerStore.get("origin"),
    forwardedHost: headerStore.get("x-forwarded-host"),
    host: headerStore.get("host"),
    forwardedProto: headerStore.get("x-forwarded-proto"),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    allowedOrigins: process.env.AUTH_ALLOWED_ORIGINS,
    nodeEnv: process.env.NODE_ENV,
  });
}

export async function getAuthUser() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

async function loadBusiness(supabase: TypedClient, businessId: string) {
  const { data: businessRow, error: businessError } = await supabase
    .from("businesses")
    .select(
      "id, name, phone, email, address, city, country, logo_url, currency, owner_id, customer_debt_alert_threshold, created_at, updated_at",
    )
    .eq("id", businessId)
    .maybeSingle();

  if (businessError || !businessRow) {
    return null;
  }

  return mapBusiness(businessRow);
}

export async function getFirstMembership(supabase: TypedClient, userId: string): Promise<MembershipLookup> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_business_id")
    .eq("id", userId)
    .maybeSingle();

  const preferredBusinessId = profile?.current_business_id;

  if (preferredBusinessId) {
    const { data: preferredMember } = await supabase
      .from("business_members")
      .select("role, status, business_id")
      .eq("user_id", userId)
      .eq("business_id", preferredBusinessId)
      .eq("status", "active")
      .maybeSingle();

    if (preferredMember && isBusinessRole(preferredMember.role)) {
      const business = await loadBusiness(supabase, preferredMember.business_id);

      if (business) {
        return { kind: "active", role: preferredMember.role, business };
      }
    }
  }

  const { data: activeMember, error: activeError } = await supabase
    .from("business_members")
    .select("role, status, business_id")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!activeError && activeMember && isBusinessRole(activeMember.role)) {
    const business = await loadBusiness(supabase, activeMember.business_id);

    if (business) {
      return { kind: "active", role: activeMember.role, business };
    }
  }

  const { data: suspendedMember } = await supabase
    .from("business_members")
    .select("role, status, business_id")
    .eq("user_id", userId)
    .eq("status", "suspended")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (suspendedMember && isMemberStatus(suspendedMember.status)) {
    const business = await loadBusiness(supabase, suspendedMember.business_id);

    if (business) {
      return { kind: "suspended", business };
    }
  }

  return null;
}

export async function getPostAuthPath(
  supabase: TypedClient,
  userId: string,
  membership?: MembershipLookup,
) {
  const resolved =
    membership === undefined ? await getFirstMembership(supabase, userId) : membership;

  if (resolved?.kind === "suspended") {
    return "/suspended";
  }

  if (await isUserPlatformAdmin(userId)) {
    return "/admin/payments";
  }

  if (resolved?.kind === "active") {
    return "/dashboard";
  }

  return "/onboarding";
}

export async function getAppUser(supabase: TypedClient, user: User) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  const metadata = user.user_metadata ?? {};

  const fullName =
    profile?.full_name ||
    (typeof metadata.full_name === "string" ? metadata.full_name : "") ||
    (typeof metadata.name === "string" ? metadata.name : "") ||
    user.email ||
    "Utilisateur";

  const phone =
    profile?.phone || (typeof metadata.phone === "string" ? metadata.phone : "") || "";

  const appUser: AppUser = {
    id: user.id,
    fullName,
    email: user.email ?? "",
    phone,
  };

  return appUser;
}

export async function requireUser() {
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export const requireBusinessSession: () => Promise<CurrentSession> = cache(
  async () => {
    const user = await requireUser();
    const supabase = await createClient();
    const membership = await getFirstMembership(supabase, user.id);

    if (!membership) {
      redirect("/onboarding");
    }

    if (membership.kind === "suspended") {
      redirect("/suspended");
    }

    const appUser = await getAppUser(supabase, user);

    return {
      user: appUser,
      business: membership.business,
      businessId: membership.business.id,
      role: membership.role,
    };
  },
);

export async function requireUserWithoutBusiness() {
  const user = await requireUser();
  const supabase = await createClient();
  const membership = await getFirstMembership(supabase, user.id);

  if (membership?.kind === "active") {
    redirect("/dashboard");
  }

  if (membership?.kind === "suspended") {
    redirect("/suspended");
  }

  return user;
}

export async function redirectIfAuthenticated() {
  const user = await getAuthUser();

  if (user) {
    redirect("/dashboard");
  }
}
