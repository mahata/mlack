import { Hono } from "hono";
import { desc } from "drizzle-orm";
import { db, messages } from "../db/index.js";
import type { Variables } from "../types.js";

const messagesRoute = new Hono<{ Variables: Variables }>();

messagesRoute.get("/api/messages", async (c) => {
  try {
    // Check if user is authenticated
    const session = c.get("session");
    const user = session.get("user") as { email?: string; name?: string; picture?: string } | undefined;

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Fetch messages from database, ordered by creation time (newest first)
    const allMessages = await db
      .select()
      .from(messages)
      .orderBy(desc(messages.createdAt))
      .limit(100); // Limit to last 100 messages

    // Return messages in chronological order (oldest first) for display
    const sortedMessages = allMessages.reverse();

    return c.json({ messages: sortedMessages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return c.json({ error: "Failed to fetch messages" }, 500);
  }
});

export { messagesRoute };