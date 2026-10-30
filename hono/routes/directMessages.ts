import { Hono } from "hono";
import { ATTACHMENT_COLUMNS } from "../db/queries.js";
import { parsePositiveInt } from "../helpers/parsePositiveInt.js";
import type { Env, User } from "../types.js";

type ConversationResponse = {
  id: number;
  otherUserEmail: string;
  otherUserName: string;
  createdAt: string | null;
};

const directMessagesRoute = new Hono<Env>();

directMessagesRoute.get("/api/dm/conversations", async (c) => {
  try {
    const { results: conversations } = await c.env.DB.prepare(
      `SELECT conversation.id, conversation.other_email AS otherUserEmail,
         COALESCE(users.name, conversation.other_email) AS otherUserName, conversation.created_at AS createdAt
       FROM (
         SELECT id, created_at, IIF(user1_email = ?1, user2_email, user1_email) AS other_email
         FROM direct_conversations WHERE ?1 IN (user1_email, user2_email)
       ) AS conversation
       LEFT JOIN users ON users.email = conversation.other_email
       ORDER BY conversation.id`,
    )
      .bind(c.get("user").email)
      .all<ConversationResponse>();

    return c.json({ conversations });
  } catch (error) {
    console.error("Error fetching DM conversations:", error);
    return c.json({ error: "Failed to fetch conversations" }, 500);
  }
});

directMessagesRoute.post("/api/dm/conversations", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const targetEmail = body.targetEmail?.trim();

    if (!targetEmail) {
      return c.json({ error: "targetEmail is required" }, 400);
    }

    if (targetEmail === user.email) {
      return c.json({ error: "Cannot start a DM with yourself" }, 400);
    }

    const target = await c.env.DB.prepare("SELECT name FROM users WHERE email = ?")
      .bind(targetEmail)
      .first<{ name: string }>();
    if (!target) {
      return c.json({ error: "User not found" }, 404);
    }

    const participants = user.email < targetEmail ? [user.email, targetEmail] : [targetEmail, user.email];
    const created = await c.env.DB.prepare(
      `INSERT INTO direct_conversations (user1_email, user2_email) SELECT ?1, ?2
       WHERE NOT EXISTS (SELECT 1 FROM direct_conversations WHERE user1_email = ?1 AND user2_email = ?2)
       RETURNING id, created_at AS createdAt`,
    )
      .bind(...participants)
      .first<{ id: number; createdAt: string | null }>();
    const conversation =
      created ??
      (await c.env.DB.prepare(
        "SELECT id, created_at AS createdAt FROM direct_conversations WHERE user1_email = ? AND user2_email = ?",
      )
        .bind(...participants)
        .first<{ id: number; createdAt: string | null }>());
    if (!conversation) {
      throw new Error("Conversation was neither created nor found");
    }

    const response: ConversationResponse = {
      id: conversation.id,
      otherUserEmail: targetEmail,
      otherUserName: target.name,
      createdAt: conversation.createdAt,
    };
    return c.json({ conversation: response }, created ? 201 : 200);
  } catch (error) {
    console.error("Error creating DM conversation:", error);
    return c.json({ error: "Failed to create conversation" }, 500);
  }
});

directMessagesRoute.get("/api/dm/conversations/:id/messages", async (c) => {
  try {
    const user = c.get("user");
    const conversationId = parsePositiveInt(c.req.param("id"));
    if (!conversationId) {
      return c.json({ error: "Invalid conversation ID" }, 400);
    }

    const conversation = await c.env.DB.prepare(
      "SELECT user1_email AS user1Email, user2_email AS user2Email FROM direct_conversations WHERE id = ?",
    )
      .bind(conversationId)
      .first<{ user1Email: string; user2Email: string }>();
    if (!conversation) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    if (conversation.user1Email !== user.email && conversation.user2Email !== user.email) {
      return c.json({ error: "Not a participant in this conversation" }, 403);
    }

    const { results } = await c.env.DB.prepare(
      `SELECT id, content, user_email AS userEmail, user_name AS userName, conversation_id AS conversationId,
         ${ATTACHMENT_COLUMNS}, created_at AS createdAt
       FROM direct_messages WHERE conversation_id = ? ORDER BY created_at DESC, id DESC LIMIT 100`,
    )
      .bind(conversationId)
      .all();

    return c.json({ messages: results.reverse() });
  } catch (error) {
    console.error("Error fetching DM messages:", error);
    return c.json({ error: "Failed to fetch messages" }, 500);
  }
});

directMessagesRoute.get("/api/dm/members", async (c) => {
  try {
    const { results: members } = await c.env.DB.prepare("SELECT email, name FROM users WHERE email != ?")
      .bind(c.get("user").email)
      .all<User>();

    return c.json({ members });
  } catch (error) {
    console.error("Error fetching DM members:", error);
    return c.json({ error: "Failed to fetch members" }, 500);
  }
});

export { directMessagesRoute };
