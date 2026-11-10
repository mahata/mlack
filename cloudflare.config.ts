import { bindings, defineConfig, exports } from "cf/config";

const PRODUCTION_DATABASE_ID = "d6405044-202a-4a50-9612-089512467c9e";
const STAGING_DATABASE_ID = "4cbf6290-3b57-4039-962f-fedd09463651";
const LOCAL_DATABASE_ID = "00000000-0000-4000-8000-000000000000";

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";
  const isStaging = mode === "staging";
  const isDeployed = isProduction || isStaging;
  const workerName = isProduction ? "mlack-production" : isStaging ? "mlack-staging" : "mlack";
  const databaseId = isProduction ? PRODUCTION_DATABASE_ID : isStaging ? STAGING_DATABASE_ID : LOCAL_DATABASE_ID;

  return {
    worker: {
      name: workerName,
      compatibilityDate: "2025-03-26",
      compatibilityFlags: ["nodejs_compat"],
      entrypoint: "hono/index.ts",
      assets: { notFoundHandling: "none" },
      domains: isProduction ? ["mlack.uk"] : isStaging ? ["staging.mlack.uk"] : [],
      workersDev: !isDeployed,
      previewUrls: isStaging ? false : undefined,
      exports: { ChatRoom: exports.durableObject({ storage: "sqlite" }) },
      env: {
        NODE_ENV: bindings.text(isProduction ? "production" : isStaging ? "staging" : "development"),
        DB: bindings.d1({ name: isStaging ? "mlack-db-staging" : "mlack-db", id: databaseId }),
        STORAGE: bindings.r2({ name: isStaging ? "mlack-uploads-staging" : "mlack-uploads" }),
        CHAT_ROOM: bindings.durableObject({ worker: workerName, exportName: "ChatRoom" }),
        SESSION_SECRET: !isDeployed && bindings.secret(),
        RESEND_API_KEY: !isDeployed && bindings.secret(),
        RESEND_FROM_EMAIL: !isDeployed && bindings.secret(),
        SITE_ADMIN_EMAIL: !isDeployed && bindings.secret(),
      },
    },
  };
});
