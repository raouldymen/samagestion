"use client";

import { createContext, useContext } from "react";
import type { CurrentSession } from "@/types";

const BusinessContext = createContext<CurrentSession | null>(null);

export function BusinessProvider({
  value,
  children,
}: {
  value: CurrentSession;
  children: React.ReactNode;
}) {
  return <BusinessContext.Provider value={value}>{children}</BusinessContext.Provider>;
}

export function useBusinessSession() {
  const session = useContext(BusinessContext);

  if (!session) {
    throw new Error("useBusinessSession doit être utilisé dans BusinessProvider.");
  }

  return session;
}
