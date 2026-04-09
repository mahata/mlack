import type { CapacitorConfig } from "@capacitor/cli";

const IS_DEV = process.env.NODE_ENV === "development";
const DEV_HOST = process.env.CAP_PLATFORM === "ios" ? "localhost" : "10.0.2.2";
const APP_URL = IS_DEV ? `http://${DEV_HOST}:8787` : "https://mlack.uk";

const config: CapacitorConfig = {
  appId: "uk.mlack.app",
  appName: "MLack",
  webDir: "www",
  server: {
    url: APP_URL,
    cleartext: IS_DEV,
    allowNavigation: ["mlack.uk", "localhost:8787", "10.0.2.2:8787"],
  },
  ios: {
    contentInset: "automatic",
    preferredContentMode: "mobile",
  },
  android: {
    allowMixedContent: IS_DEV,
  },
};

export default config;
