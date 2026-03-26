import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { db, messages } from "../db/index.js";
import type { User, Variables } from "../types.js";

const messagesRoute = new Hono<{ Variables: Variables }>();

messagesRoute.get("/api/messages", async (c) => {
  try {
    const session = c.get("session");
    const user = session.get("user") as User | undefined;

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const channelIdParam = c.req.query("channelId");
    if (!channelIdParam) {
      return c.json({ error: "channelId query parameter is required" }, 400);
    }

    const channelId = Number(channelIdParam);
    if (Number.isNaN(channelId)) {
      return c.json({ error: "Invalid channelId" }, 400);
    }

    const allMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.channelId, channelId))
      .orderBy(desc(messages.createdAt))
      .limit(100);

    const sortedMessages = allMessages.reverse();

    return c.json({ messages: sortedMessages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return c.json({ error: "Failed to fetch messages" }, 500);
  }
});

export { messagesRoute };
