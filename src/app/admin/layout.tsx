import { LogOut } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/admin/access";
import { signOut } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

/**
 * Zone plateforme séparée des commerces. Les utilisateurs non autorisés reçoivent 404.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin();
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <p className="text-sm font-medium text-primary">Administration plateforme</p>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="size-4" aria-hidden="true" />
              Déconnexion
            </Button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
