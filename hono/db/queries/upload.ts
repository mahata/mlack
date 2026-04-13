import { eq, sql } from "drizzle-orm";
import { directMessages, messages } from "../schema.js";
import type { Database } from "./types.js";

export async function getUserTotalUploadSize(db: Database, userEmail: string): Promise<number> {
  const [channelResult, dmResult] = await Promise.all([
    db
      .select({ total: sql<number>`COALESCE(SUM(${messages.attachmentSize}), 0)` })
      .from(messages)
      .where(eq(messages.userEmail, userEmail)),
    db
      .select({ total: sql<number>`COALESCE(SUM(${directMessages.attachmentSize}), 0)` })
      .from(directMessages)
      .where(eq(directMessages.userEmail, userEmail)),
  ]);

  return (channelResult[0]?.total ?? 0) + (dmResult[0]?.total ?? 0);
}
