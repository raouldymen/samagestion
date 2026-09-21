"use client";

import { Capacitor } from "@capacitor/core";
import { Download, Share, Smartphone } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

function isAppleMobile() {
  return typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isInstalled() {
  return (
    typeof window !== "undefined" &&
    (Capacitor.isNativePlatform() ||
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone)))
  );
}

function subscribe() {
  return () => undefined;
}

export function MobileAppInstall() {
  const appleMobile = useSyncExternalStore(subscribe, isAppleMobile, () => false);
  const installed = useSyncExternalStore(subscribe, isInstalled, () => false);
  const [showAppleInstructions, setShowAppleInstructions] = useState(false);

  if (installed) {
    return null;
  }

  return (
    <section className="mt-6 border-t border-border pt-5" aria-label="Application mobile">
      <p className="text-center text-sm font-medium text-foreground">Installez SamaGestion sur votre téléphone</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <a
          href="/downloads/samagestion-android.apk"
          download
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Download className="size-4" aria-hidden="true" />
          Télécharger Android
        </a>
        <button
          type="button"
          onClick={() => setShowAppleInstructions((value) => !value)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {appleMobile ? <Share className="size-4" aria-hidden="true" /> : <Smartphone className="size-4" aria-hidden="true" />}
          Installer sur iPhone/iPad
        </button>
      </div>
      {showAppleInstructions ? (
        <p className="mt-3 rounded-lg bg-primary-soft px-3 py-2 text-center text-sm text-primary">
          Dans Safari, touchez Partager, puis choisissez « Sur l&apos;écran d&apos;accueil ».
        </p>
      ) : null}
    </section>
  );
}
