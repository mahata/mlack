import { and, eq, or } from "drizzle-orm";
import { directConversations } from "../schema.js";
import type { Database } from "./types.js";

export async function getConversationForParticipant(
  db: Database,
  conversationId: number,
  userEmail: string,
  workspaceId?: number,
) {
  const participantCondition = or(
    eq(directConversations.user1Email, userEmail),
    eq(directConversations.user2Email, userEmail),
  );

  const whereCondition =
    workspaceId !== undefined
      ? and(
          eq(directConversations.id, conversationId),
          eq(directConversations.workspaceId, workspaceId),
          participantCondition,
        )
      : and(eq(directConversations.id, conversationId), participantCondition);

  const [conversation] = await db.select().from(directConversations).where(whereCondition);
  return conversation ?? null;
}
