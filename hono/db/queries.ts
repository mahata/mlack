export type Channel = {
  id: number;
  name: string;
  createdByEmail: string;
  createdAt: string | null;
};

export type ConversationParticipants = {
  user1Email: string;
  user2Email: string;
};

export const CHANNEL_COLUMNS = "id, name, created_by_email AS createdByEmail, created_at AS createdAt";

export const ATTACHMENT_COLUMNS =
  "attachment_key AS attachmentKey, attachment_name AS attachmentName, attachment_type AS attachmentType, attachment_size AS attachmentSize";

export async function isChannelMember(db: D1Database, channelId: number, userEmail: string): Promise<boolean> {
  const membership = await db
    .prepare("SELECT 1 FROM channel_members WHERE channel_id = ? AND user_email = ?")
    .bind(channelId, userEmail)
    .first();
  return membership !== null;
}

export function getChannelById(db: D1Database, channelId: number): Promise<Channel | null> {
  return db.prepare(`SELECT ${CHANNEL_COLUMNS} FROM channels WHERE id = ?`).bind(channelId).first<Channel>();
}

export function getConversationForParticipant(
  db: D1Database,
  conversationId: number,
  userEmail: string,
): Promise<ConversationParticipants | null> {
  return db
    .prepare(
      "SELECT user1_email AS user1Email, user2_email AS user2Email FROM direct_conversations WHERE id = ?1 AND ?2 IN (user1_email, user2_email)",
    )
    .bind(conversationId, userEmail)
    .first<ConversationParticipants>();
}
