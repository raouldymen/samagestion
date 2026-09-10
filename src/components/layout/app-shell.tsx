"use client";

import { useState } from "react";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileTopBar } from "@/components/layout/mobile-top-bar";
import { PlusSheet } from "@/components/layout/plus-sheet";
import { Sidebar } from "@/components/layout/sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [plusOpen, setPlusOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar />
      <div className="lg:pl-[var(--sidebar-width)] print:pl-0">
        <MobileTopBar />
        <main className="mx-auto w-full max-w-7xl px-4 pt-5 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1.25rem)] sm:px-6 lg:px-8 lg:py-8 print:max-w-none print:px-0 print:py-0 print:pb-0">
          {children}
        </main>
      </div>
      <MobileBottomNav
        plusOpen={plusOpen}
        onPlusToggle={() => setPlusOpen((open) => !open)}
      />
      <PlusSheet open={plusOpen} onClose={() => setPlusOpen(false)} />
    </div>
  );
}
