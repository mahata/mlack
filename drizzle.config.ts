import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./hono/db/schema.ts",
  out: "./hono/db/migrations",
  dialect: "sqlite",
});
