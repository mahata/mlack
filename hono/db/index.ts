import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema.js";

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | null = null;
let cachedD1: D1Database | null = null;

export function getDb(d1: D1Database) {
  if (cachedDb && cachedD1 === d1) {
    return cachedDb;
  }
  cachedD1 = d1;
  cachedDb = drizzle(d1, { schema });
  return cachedDb;
}

export * from "./schema.js";
