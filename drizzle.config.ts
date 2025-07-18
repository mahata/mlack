import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./hono/db/schema.ts",
  out: "./hono/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.POSTGRES_PORT) || 5432,
    user: process.env.POSTGRES_USER || "postgres",
    password: process.env.POSTGRES_PASSWORD || "mysecretpassword",
    database: process.env.POSTGRES_DB || "postgres",
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  },
});
