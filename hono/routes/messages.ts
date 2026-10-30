import { Hono } from "hono";
import { ATTACHMENT_COLUMNS, getChannelById, isChannelMember } from "../db/queries.js";
import { parsePositiveInt } from "../helpers/parsePositiveInt.js";
import type { Env } from "../types.js";

const messagesRoute = new Hono<Env>();

messagesRoute.get("/api/messages", async (c) => {
  try {
    const channelIdParam = c.req.query("channelId");
    if (!channelIdParam) {
      return c.json({ error: "channelId query parameter is required" }, 400);
    }

    const channelId = parsePositiveInt(channelIdParam);
    if (!channelId) {
      return c.json({ error: "Invalid channelId" }, 400);
    }

    if (!(await getChannelById(c.env.DB, channelId))) {
      return c.json({ error: "Channel not found" }, 404);
    }

    if (!(await isChannelMember(c.env.DB, channelId, c.get("user").email))) {
      return c.json({ error: "Not a member of this channel" }, 403);
    }

    const { results } = await c.env.DB.prepare(
      `SELECT id, content, user_email AS userEmail, user_name AS userName, channel_id AS channelId,
         ${ATTACHMENT_COLUMNS}, created_at AS createdAt
       FROM messages WHERE channel_id = ? ORDER BY created_at DESC, id DESC LIMIT 100`,
    )
      .bind(channelId)
      .all();

    return c.json({ messages: results.reverse() });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return c.json({ error: "Failed to fetch messages" }, 500);
  }
});

export { messagesRoute };
