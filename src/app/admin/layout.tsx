import { requirePlatformAdmin } from "@/lib/admin/access";

/**
 * Zone plateforme séparée des commerces. Les utilisateurs non autorisés reçoivent 404.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();
  return children;
}
