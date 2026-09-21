"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/** Regroupe les notifications temps réel reçues en rafale en un seul rafraîchissement. */
export function useCoalescedRouterRefresh(delay = 500) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(() => {
    if (timer.current) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      router.refresh();
    }, delay);
  }, [delay, router]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return refresh;
}
