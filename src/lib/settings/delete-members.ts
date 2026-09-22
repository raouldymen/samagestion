import { isUserPlatformAdmin } from "@/lib/admin/access";
import { createServiceClient, isServiceRoleConfigured } from "@/lib/payments/service-client";

export function memberIdsFromDeleteResult(data: unknown): string[] {
  if (Array.isArray(data)) {
    return data.flatMap((value) => (value ? [String(value)] : []));
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const row = data as Record<string, unknown>;
  const ids = row.memberIds ?? row.member_ids;
  if (!Array.isArray(ids)) {
    return [];
  }

  return ids.flatMap((value) => (value ? [String(value)] : []));
}

export async function deleteOrphanedMemberAccounts(memberIds: string[]) {
  if (!isServiceRoleConfigured() || memberIds.length === 0) {
    return;
  }

  const service = createServiceClient();
  const uniqueIds = [...new Set(memberIds)];

  for (const userId of uniqueIds) {
    if (await isUserPlatformAdmin(userId)) {
      continue;
    }

    const { count } = await service
      .from("business_members")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if ((count ?? 0) > 0) {
      continue;
    }

    await service.auth.admin.deleteUser(userId).catch(() => undefined);
  }
}
