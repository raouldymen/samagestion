import { redirect } from "next/navigation";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";
import type { CurrentSession } from "@/types";

export async function requirePermission(permission: Permission): Promise<CurrentSession> {
  const session = await requireBusinessSession();

  if (!hasPermission(session.role, permission)) {
    redirect("/dashboard");
  }

  return session;
}

export function assertPermission(session: CurrentSession, permission: Permission) {
  if (!hasPermission(session.role, permission)) {
    throw new Error("FORBIDDEN");
  }
}
