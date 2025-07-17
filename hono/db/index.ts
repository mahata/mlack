import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

// Create PostgreSQL connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "mysecretpassword",
  database: process.env.POSTGRES_DB || "postgres",
});

// Create Drizzle instance
export const db = drizzle(pool, { schema });

// Export schema for use in other files
export * from "./schema.js";