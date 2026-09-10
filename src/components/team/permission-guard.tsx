"use client";

import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { useBusiness } from "@/hooks/use-business";

export function PermissionGuard({
  permission,
  children,
}: {
  permission: Permission;
  children: React.ReactNode;
}) {
  const { role } = useBusiness();

  if (!hasPermission(role, permission)) {
    return null;
  }

  return children;
}
