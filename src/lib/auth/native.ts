import { Capacitor } from "@capacitor/core";

export const NATIVE_AUTH_CALLBACK = "com.samagestion.app://auth/callback";

export function isNativeApp() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}
