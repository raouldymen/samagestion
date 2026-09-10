"use client";

import { useBusinessSession } from "@/components/providers/business-provider";

export function useUser() {
  const session = useBusinessSession();

  return {
    user: session.user,
    isLoading: false,
  };
}
