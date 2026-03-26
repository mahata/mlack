import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { channelMembers, channels, db } from "../db/index.js";
import type { User, Variables } from "../types.js";

const channelsRoute = new Hono<{ Variables: Variables }>();

channelsRoute.get("/api/channels", async (c) => {
  try {
    const session = c.get("session");
    const user = session.get("user") as User | undefined;

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const allChannels = await db.select().from(channels);

    return c.json({ channels: allChannels });
  } catch (error) {
    console.error("Error fetching channels:", error);
    return c.json({ error: "Failed to fetch channels" }, 500);
  }
});

channelsRoute.post("/api/channels", async (c) => {
  try {
    const session = c.get("session");
    const user = session.get("user") as User | undefined;

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const body = await c.req.json();
    const name = body.name?.trim();

    if (!name) {
      return c.json({ error: "Channel name is required" }, 400);
    }

    const existing = await db.select().from(channels).where(eq(channels.name, name));
    if (existing.length > 0) {
      return c.json({ error: "Channel name already exists" }, 409);
    }

    const [created] = await db
      .insert(channels)
      .values({ name, createdByEmail: user.email || "unknown" })
      .returning();

    await db.insert(channelMembers).values({ channelId: created.id, userEmail: user.email || "unknown" });

    return c.json({ channel: created }, 201);
  } catch (error) {
    console.error("Error creating channel:", error);
    return c.json({ error: "Failed to create channel" }, 500);
  }
});

channelsRoute.post("/api/channels/:id/join", async (c) => {
  try {
    const session = c.get("session");
    const user = session.get("user") as User | undefined;

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const channelId = Number(c.req.param("id"));
    if (Number.isNaN(channelId)) {
      return c.json({ error: "Invalid channel ID" }, 400);
    }

    const channel = await db.select().from(channels).where(eq(channels.id, channelId));
    if (channel.length === 0) {
      return c.json({ error: "Channel not found" }, 404);
    }

    const existing = await db
      .select()
      .from(channelMembers)
      .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userEmail, user.email || "unknown")));

    if (existing.length > 0) {
      return c.json({ message: "Already a member" }, 200);
    }

    await db.insert(channelMembers).values({ channelId, userEmail: user.email || "unknown" });

    return c.json({ message: "Joined channel" }, 200);
  } catch (error) {
    console.error("Error joining channel:", error);
    return c.json({ error: "Failed to join channel" }, 500);
  }
});

channelsRoute.post("/api/channels/:id/leave", async (c) => {
  try {
    const session = c.get("session");
    const user = session.get("user") as User | undefined;

    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const channelId = Number(c.req.param("id"));
    if (Number.isNaN(channelId)) {
      return c.json({ error: "Invalid channel ID" }, 400);
    }

    const channel = await db.select().from(channels).where(eq(channels.id, channelId));
    if (channel.length === 0) {
      return c.json({ error: "Channel not found" }, 404);
    }

    if (channel[0].name === "general") {
      return c.json({ error: "Cannot leave #general" }, 403);
    }

    await db
      .delete(channelMembers)
      .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userEmail, user.email || "unknown")));

    return c.json({ message: "Left channel" }, 200);
  } catch (error) {
    console.error("Error leaving channel:", error);
    return c.json({ error: "Failed to leave channel" }, 500);
  }
});

export { channelsRoute };
