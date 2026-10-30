import { bindings, defineConfig, exports } from "cf/config";

const PRODUCTION_DATABASE_ID = "d6405044-202a-4a50-9612-089512467c9e";
const LOCAL_DATABASE_ID = "00000000-0000-4000-8000-000000000000";

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";
  const workerName = isProduction ? "mlack-production" : "mlack";

  return {
    worker: {
      name: workerName,
      compatibilityDate: "2025-03-26",
      compatibilityFlags: ["nodejs_compat"],
      entrypoint: "hono/index.ts",
      assets: { notFoundHandling: "none" },
      domains: isProduction ? ["mlack.uk"] : [],
      workersDev: !isProduction,
      exports: { ChatRoom: exports.durableObject({ storage: "sqlite" }) },
      env: {
        NODE_ENV: bindings.text(isProduction ? "production" : "development"),
        DB: bindings.d1({ name: "mlack-db", id: isProduction ? PRODUCTION_DATABASE_ID : LOCAL_DATABASE_ID }),
        STORAGE: bindings.r2({ name: "mlack-uploads" }),
        CHAT_ROOM: bindings.durableObject({ worker: workerName, exportName: "ChatRoom" }),
        SESSION_SECRET: !isProduction && bindings.secret(),
        RESEND_API_KEY: !isProduction && bindings.secret(),
        RESEND_FROM_EMAIL: !isProduction && bindings.secret(),
        SITE_ADMIN_EMAIL: !isProduction && bindings.secret(),
      },
    },
  };
});
