import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

function findLocalD1Database(): string {
  const d1Dir = path.join(".wrangler", "state", "v3", "d1", "miniflare-D1DatabaseObject");
  if (!fs.existsSync(d1Dir)) {
    throw new Error(`D1 directory not found: ${d1Dir}\nRun "pnpm dev" once to initialize the local database.`);
  }
  const sqliteFile = fs.readdirSync(d1Dir).find((f) => f.endsWith(".sqlite"));
  if (!sqliteFile) {
    throw new Error(`No .sqlite file found in ${d1Dir}\nRun "pnpm dev" once to initialize the local database.`);
  }
  return path.join(d1Dir, sqliteFile);
}

export default defineConfig({
  schema: "./hono/db/schema.ts",
  out: "./hono/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: findLocalD1Database(),
  },
});
