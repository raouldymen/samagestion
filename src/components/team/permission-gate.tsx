import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { requireBusinessSession } from "@/lib/auth/session";

export async function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const session = await requireBusinessSession();

  if (!hasPermission(session.role, permission)) {
    return fallback;
  }

  return children;
}
