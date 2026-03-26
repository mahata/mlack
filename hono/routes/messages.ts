import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { requireUser } from "../auth/requireUser.js";
import { db, messages } from "../db/index.js";
import type { Variables } from "../types.js";

const messagesRoute = new Hono<{ Variables: Variables }>();

messagesRoute.get("/api/messages", requireUser, async (c) => {
  try {
    const channelIdParam = c.req.query("channelId");
    if (!channelIdParam) {
      return c.json({ error: "channelId query parameter is required" }, 400);
    }

    const channelId = Number(channelIdParam);
    if (Number.isNaN(channelId)) {
      return c.json({ error: "Invalid channelId" }, 400);
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
