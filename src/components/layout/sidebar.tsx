"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useBusiness } from "@/hooks/use-business";
import { useUser } from "@/hooks/use-user";
import { signOut } from "@/lib/auth/actions";
import { DESKTOP_NAV, isNavActive, navForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils/cn";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { business, role } = useBusiness();
  const items = navForRole(DESKTOP_NAV, role);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-width)] flex-col border-r border-border bg-sidebar print:hidden lg:flex">
      <div className="flex h-16 items-center justify-between gap-2 px-5">
        <Logo href="/dashboard" />
        <NotificationBell />
      </div>
      <p className="truncate px-5 pb-3 text-xs text-muted-foreground">{business.name}</p>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2" aria-label="Navigation principale">
        {items.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-slate-600 hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <Avatar name={user.fullName} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{user.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <form action={signOut} className="mt-3">
          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Déconnexion
          </button>
        </form>
      </div>
    </aside>
  );
}
