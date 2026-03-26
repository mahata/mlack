import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { dbCredentials } from "./config.js";
import * as schema from "./schema.js";

const pool = new Pool(dbCredentials);

export const db = drizzle(pool, { schema });

export * from "./schema.js";
