"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useBusinessSession } from "@/components/providers/business-provider";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";

const TeamPresenceContext = createContext<Set<string>>(new Set());

export function TeamPresenceProvider({ children }: { children: React.ReactNode }) {
  const session = useBusinessSession();
  const [onlineIds, setOnlineIds] = useState<Set<string>>(() => new Set([session.user.id]));

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`team-presence-${session.businessId}`, {
      config: { presence: { key: session.user.id } },
    });

    const sync = () => {
      const ids = new Set(Object.keys(channel.presenceState()));
      ids.add(session.user.id);
      setOnlineIds(ids);
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({
            userId: session.user.id,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [session.businessId, session.user.id]);

  return <TeamPresenceContext.Provider value={onlineIds}>{children}</TeamPresenceContext.Provider>;
}

export function useMemberOnline(userId: string) {
  const onlineIds = useContext(TeamPresenceContext);
  return onlineIds.has(userId);
}

export function MemberPresenceBadge({ userId }: { userId: string }) {
  const online = useMemberOnline(userId);

  return (
    <Badge variant={online ? "success" : "neutral"}>
      <span className={`mr-1.5 inline-block size-1.5 rounded-full ${online ? "bg-success" : "bg-muted-foreground"}`} aria-hidden="true" />
      {online ? "En ligne" : "Déconnecté"}
    </Badge>
  );
}
