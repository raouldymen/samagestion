"use client";

import { useEffect } from "react";
import Link from "next/link";
import { LogOut, X } from "lucide-react";
import { PLUS_NAV, navForRole } from "@/lib/navigation";
import { signOut } from "@/lib/auth/actions";
import { useBusiness } from "@/hooks/use-business";
import { canAccessSettingsSection } from "@/lib/settings/sections";

type PlusSheetProps = {
  open: boolean;
  onClose: () => void;
};

export function PlusSheet({ open, onClose }: PlusSheetProps) {
  const { role, hasActiveCashier } = useBusiness();
  const items = navForRole(PLUS_NAV, role, hasActiveCashier).filter(
    (item) => item.href !== "/settings/receipts" || canAccessSettingsSection(role, "receipts"),
  );
  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 print:hidden lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Fermer le menu"
        onClick={onClose}
      />
      <div
        id="plus-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plus-sheet-title"
        className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-card pb-[env(safe-area-inset-bottom)] shadow-lg"
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 id="plus-sheet-title" className="text-base font-semibold">
            Menu
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fermer"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 px-3 pb-3" aria-label="Autres pages et réglages">
          {items.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={onClose}
                className="flex min-h-12 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Icon className="size-5 text-primary" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
          <form action={signOut}>
            <button
              type="submit"
              className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className="size-5 text-primary" aria-hidden="true" />
              Déconnexion
            </button>
          </form>
        </nav>
      </div>
    </div>
  );
}
