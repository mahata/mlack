import type { CapacitorConfig } from "@capacitor/cli";

const IS_DEV = process.env.NODE_ENV === "development";
const IS_ANDROID = process.env.CAP_PLATFORM === "android";
const DEV_HOST = IS_ANDROID ? "10.0.2.2" : "localhost";
const APP_URL = IS_DEV ? `http://${DEV_HOST}:8787` : "https://mlack.uk";

const config: CapacitorConfig = {
  appId: "uk.mlack.app",
  appName: "Mlack",
  webDir: "www",
  server: {
    url: APP_URL,
    cleartext: IS_DEV,
    allowNavigation: IS_DEV ? ["mlack.uk", "localhost:8787", "10.0.2.2:8787"] : ["mlack.uk"],
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
