import { and, eq, or } from "drizzle-orm";
import { directConversations } from "../schema.js";
import type { Database } from "./types.js";

export async function getConversationForParticipant(db: Database, conversationId: number, userEmail: string) {
  const [conversation] = await db
    .select()
    .from(directConversations)
    .where(
      and(
        eq(directConversations.id, conversationId),
        or(eq(directConversations.user1Email, userEmail), eq(directConversations.user2Email, userEmail)),
      ),
    );
  return conversation ?? null;
}
