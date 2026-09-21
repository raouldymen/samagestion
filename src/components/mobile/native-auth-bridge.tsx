"use client";

import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { useEffect, useRef } from "react";
import { NATIVE_AUTH_CALLBACK, isNativeApp } from "@/lib/auth/native";
import { createClient } from "@/lib/supabase/client";

function isAuthCallback(url: string) {
  try {
    const callback = new URL(url);
    return `${callback.protocol}//${callback.host}${callback.pathname}` === NATIVE_AUTH_CALLBACK;
  } catch {
    return false;
  }
}

export function NativeAuthBridge() {
  const handledUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!isNativeApp()) {
      return;
    }

    const handleCallback = async (url: string) => {
      if (!isAuthCallback(url) || handledUrl.current === url) {
        return;
      }

      handledUrl.current = url;

      try {
        const callback = new URL(url);
        const error = callback.searchParams.get("error");
        const code = callback.searchParams.get("code");

        if (error || !code) {
          throw new Error(error ?? "oauth_callback_missing_code");
        }

        const supabase = createClient();
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          throw exchangeError;
        }

        await Browser.close();
        window.location.assign("/dashboard");
      } catch {
        await Browser.close().catch(() => undefined);
        window.location.assign("/login?error=oauth");
      }
    };

    let removeListener: (() => Promise<void>) | undefined;

    void App.addListener("appUrlOpen", ({ url }) => {
      void handleCallback(url);
    }).then((listener) => {
      removeListener = listener.remove;
    });

    void App.getLaunchUrl().then((launch) => {
      if (launch?.url) {
        void handleCallback(launch.url);
      }
    });

    return () => {
      void removeListener?.();
    };
  }, []);

  return null;
}
