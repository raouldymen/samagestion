import type { BusinessRole, Json } from "@/types/database";
import type { Permission } from "@/lib/auth/permissions";

export type MemberRole = BusinessRole;
export type MemberStatus = "active" | "invited" | "suspended";
export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled";

export type TeamMember = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  createdAt: string;
  lastActivityAt: string;
  isPrimaryOwner: boolean;
};

export type Invitation = {
  id: string;
  businessId: string;
  email: string;
  role: Exclude<MemberRole, "owner">;
  token: string;
  status: InvitationStatus;
  expiresAt: string;
  invitedBy: string;
  createdAt: string;
  acceptUrl: string;
};

export type AuditLog = {
  id: string;
  businessId: string;
  userId: string;
  actorName: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, Json | undefined>;
  createdAt: string;
};

export type AuditLogFilters = {
  userId?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
};

export type { Permission };
