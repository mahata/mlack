import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, messages } from "../db/index.js";
import { getChannelById, isChannelMember } from "../db/queries/index.js";
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

    const db = getDb(c.env.DB);
    const user = c.get("user");

    const channel = await getChannelById(db, channelId);
    if (!channel) {
      return c.json({ error: "Channel not found" }, 404);
    }

    const isMember = await isChannelMember(db, channelId, user.email);

    if (!isMember) {
      return c.json({ error: "Not a member of this channel" }, 403);
    }

    const latestMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.channelId, channelId))
      .orderBy(desc(messages.createdAt))
      .limit(100);

    return c.json({ messages: latestMessages.reverse() });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return c.json({ error: "Failed to fetch messages" }, 500);
  }
});

export { messagesRoute };
