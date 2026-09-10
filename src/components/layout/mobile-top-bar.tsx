"use client";

import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useUser } from "@/hooks/use-user";

export function MobileTopBar() {
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-sm print:hidden lg:hidden">
      <Logo href="/dashboard" size="sm" />
      <div className="flex items-center gap-1">
        <NotificationBell />
        <Avatar name={user.fullName} size="sm" />
      </div>
    </header>
  );
}
