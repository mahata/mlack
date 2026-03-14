import { defineConfig } from "drizzle-kit";
import { dbCredentials } from "./hono/db/config.js";

export default defineConfig({
  schema: "./hono/db/schema.ts",
  out: "./hono/db/migrations",
  dialect: "postgresql",
  dbCredentials,
});
