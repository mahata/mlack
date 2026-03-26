export const dbCredentials = {
  host: process.env.POSTGRES_HOST || "localhost",
  port: Number(process.env.POSTGRES_PORT) || 5437,
  user: process.env.POSTGRES_USER || "postgres",
  password: process.env.POSTGRES_PASSWORD || "mysecretpassword",
  database: process.env.POSTGRES_DB || "postgres",
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
} as const;
