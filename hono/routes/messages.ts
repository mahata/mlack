import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { requireUser } from "../auth/requireUser.js";
import { channelMembers, getDb, messages } from "../db/index.js";
import type { Env } from "../types.js";

const messagesRoute = new Hono<Env>();

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

    const db = getDb(c.env.DB);
    const user = c.get("user");

    const membership = await db
      .select()
      .from(channelMembers)
      .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userEmail, user.email)));

    if (membership.length === 0) {
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
