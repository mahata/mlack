import type { CapacitorConfig } from "@capacitor/cli";

const IS_DEV = process.env.NODE_ENV === "development";
const APP_URL = IS_DEV ? "http://localhost:8787" : "https://mlack.uk";

const config: CapacitorConfig = {
  appId: "uk.mlack.app",
  appName: "MLack",
  webDir: "www",
  server: {
    url: APP_URL,
    allowNavigation: ["mlack.uk", "localhost:8787"],
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
