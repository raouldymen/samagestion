import type { AppNotification } from "@/types/notifications";

/**
 * Point d'extension Realtime.
 * Aucun canal n'est ouvert aujourd'hui : le compteur est lu côté serveur.
 * Brancher ici `supabase.channel(...).on('postgres_changes', ...)` plus tard.
 */
export function subscribeToNotifications(
  userId: string,
  onChange: (payload: { unreadDelta?: number; notification?: AppNotification }) => void,
) {
  void userId;
  void onChange;
  return () => undefined;
}
