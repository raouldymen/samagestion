"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { isNavActive, MOBILE_NAV, navForRole } from "@/lib/navigation";
import { cn } from "@/lib/utils/cn";
import { useBusiness } from "@/hooks/use-business";

type MobileBottomNavProps = {
  plusOpen: boolean;
  onPlusToggle: () => void;
};

export function MobileBottomNav({ plusOpen, onPlusToggle }: MobileBottomNavProps) {
  const pathname = usePathname();
  const { role } = useBusiness();
  const items = navForRole(MOBILE_NAV, role);
  const columns = items.length + 1;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] print:hidden lg:hidden"
      aria-label="Navigation mobile"
    >
      <ul
        className="grid h-[var(--bottom-nav-height)]"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = isNavActive(pathname, item.href);
          const Icon = item.icon;

          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                prefetch
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full min-h-12 flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="min-w-0">
          <button
            type="button"
            onClick={onPlusToggle}
            aria-expanded={plusOpen}
            aria-controls="plus-sheet"
            className={cn(
              "flex h-full min-h-12 w-full flex-col items-center justify-center gap-1 px-1 text-[11px] font-medium",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
              plusOpen ? "text-primary" : "text-muted-foreground",
            )}
          >
            <MoreHorizontal className="size-5" aria-hidden="true" />
            Plus
          </button>
        </li>
      </ul>
    </nav>
  );
}
