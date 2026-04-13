import { desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { getDb, messages } from "../db/index.js";
import { getChannelInWorkspace, isChannelMember } from "../db/queries/index.js";
import { getWorkspace } from "../helpers/getWorkspace.js";
import type { Env } from "../types.js";

const messagesRoute = new Hono<Env>();

messagesRoute.get("/w/:slug/api/messages", async (c) => {
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
    const workspace = getWorkspace(c);

    const channel = await getChannelInWorkspace(db, channelId, workspace.id);
    if (!channel) {
      return c.json({ error: "Channel not found in this workspace" }, 404);
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
