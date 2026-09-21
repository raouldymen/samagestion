import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.samagestion.app",
  appName: "SamaGestion",
  webDir: "public",
  server: {
    url: "https://samagestion-zeta.vercel.app",
    cleartext: false,
  },
};

export default config;
