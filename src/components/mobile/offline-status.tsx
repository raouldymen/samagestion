"use client";

import { useEffect, useState } from "react";

export function OfflineStatus() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <p className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[60] rounded-lg bg-slate-900 px-3 py-2 text-center text-xs font-medium text-white shadow-lg">
      Mode hors connexion : les ventes peuvent être enregistrées et seront envoyées dès le retour du réseau.
    </p>
  );
}
