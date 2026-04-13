import { eq, inArray } from "drizzle-orm";
import { users } from "../schema.js";
import type { Database } from "./types.js";

export async function getUserNameByEmail(db: Database, email: string): Promise<string | null> {
  const [user] = await db.select({ name: users.name }).from(users).where(eq(users.email, email));
  return user?.name ?? null;
}

export async function getUsersByEmails(
  db: Database,
  emails: string[],
): Promise<Array<{ email: string; name: string }>> {
  if (emails.length === 0) return [];
  return db.select({ email: users.email, name: users.name }).from(users).where(inArray(users.email, emails));
}
