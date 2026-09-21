import { requirePermission } from "@/lib/auth/access";
import { isAssignableRole } from "@/lib/auth/permissions";
import { getRequestOrigin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { BusinessRole, InvitationStatus, Json, MemberStatus } from "@/types/database";
import type { AuditLog, AuditLogFilters, Invitation, TeamMember } from "@/types/team";

function asRole(value: string): BusinessRole {
  if (
    value === "owner" ||
    value === "manager" ||
    value === "cashier" ||
    value === "seller" ||
    value === "stock_manager"
  ) {
    return value;
  }

  return "seller";
}

function asStatus(value: string): MemberStatus {
  if (value === "active" || value === "invited" || value === "suspended") {
    return value;
  }

  return "active";
}

function asInvitationStatus(value: string, expiresAt: string): InvitationStatus {
  if (value === "pending" && new Date(expiresAt).getTime() < Date.now()) {
    return "expired";
  }

  if (value === "pending" || value === "accepted" || value === "expired" || value === "cancelled") {
    return value;
  }

  return "pending";
}

function asAssignableRole(value: string): Exclude<BusinessRole, "owner"> {
  return isAssignableRole(value) ? value : "seller";
}

function asMetadata(value: Json): Record<string, Json | undefined> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  return {};
}

export async function listTeamMembers(): Promise<TeamMember[]> {
  const session = await requirePermission("team.view");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_team_members");
  const rows = Array.isArray(data) ? data : data ? [data] : [];

  if (error) {
    // La liste reste disponible même si la fonction SQL dédiée est momentanément
    // indisponible (par exemple juste après une mise à jour de la base).
    const { data: fallbackRows } = await supabase
      .from("business_members")
      .select("id, user_id, role, status, created_at, updated_at")
      .eq("business_id", session.businessId)
      .in("status", ["active", "invited", "suspended"])
      .order("created_at", { ascending: true });

    const userIds = [...new Set((fallbackRows ?? []).map((row) => row.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] as Array<{ id: string; full_name: string | null }> };
    const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));

    return (fallbackRows ?? []).map((row) => {
      return {
        id: row.id,
        userId: row.user_id,
        fullName: names.get(row.user_id) || "Membre",
        email: "Non renseigné",
        role: asRole(row.role),
        status: asStatus(row.status),
        createdAt: row.created_at,
        lastActivityAt: row.updated_at,
        isPrimaryOwner: row.user_id === session.business.ownerId || row.role === "owner",
      };
    });
  }

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name || row.email || "Membre",
    email: row.email,
    role: asRole(row.role),
    status: asStatus(row.status),
    createdAt: row.created_at,
    lastActivityAt: row.last_activity_at,
    isPrimaryOwner: row.user_id === session.business.ownerId || row.role === "owner",
  }));
}

export async function getTeamMember(memberId: string): Promise<TeamMember | null> {
  const members = await listTeamMembers();
  return members.find((member) => member.id === memberId) ?? null;
}

export async function listInvitations(): Promise<Invitation[]> {
  await requirePermission("team.view");
  const origin = await getRequestOrigin();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_business_invitations");
  const rows = Array.isArray(data) ? data : data ? [data] : [];

  if (error) {
    return [];
  }

  return rows.map((row) => ({
    id: row.id,
    businessId: row.business_id,
    email: row.email,
    role: asAssignableRole(row.role),
    token: row.token,
    status: asInvitationStatus(row.status, row.expires_at),
    expiresAt: row.expires_at,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
    acceptUrl: `${origin}/invitations/${row.token}`,
  }));
}

export async function getInvitationByToken(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_invitation_by_token", {
    p_token: token,
  });
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row) {
    return null;
  }

  return {
    id: row.id,
    businessId: row.business_id,
    businessName: row.business_name,
    email: row.email,
    role: asAssignableRole(row.role),
    status: asInvitationStatus(row.status, row.expires_at),
    expiresAt: row.expires_at,
  };
}

export async function listAuditLogs(filters: AuditLogFilters = {}): Promise<AuditLog[]> {
  const session = await requirePermission("team.view");
  const supabase = await createClient();
  let query = supabase
    .from("audit_logs")
    .select("id, business_id, user_id, action, entity_type, entity_id, metadata, created_at")
    .eq("business_id", session.businessId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.userId) {
    query = query.eq("user_id", filters.userId);
  }

  if (filters.action) {
    query = query.eq("action", filters.action);
  }

  if (filters.entityType) {
    query = query.eq("entity_type", filters.entityType);
  }

  if (filters.from) {
    query = query.gte("created_at", `${filters.from}T00:00:00.000Z`);
  }

  if (filters.to) {
    query = query.lt("created_at", `${filters.to}T23:59:59.999Z`);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  const userIds = [...new Set(data.map((row) => row.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));

  return data.map((row) => ({
    id: row.id,
    businessId: row.business_id,
    userId: row.user_id,
    actorName: names.get(row.user_id) || "Membre",
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: asMetadata(row.metadata),
    createdAt: row.created_at,
  }));
}
