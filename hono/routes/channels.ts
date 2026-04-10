import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { channelMembers, channels, getDb, users } from "../db/index.js";
import { getWorkspace } from "../helpers/getWorkspace.js";
import type { Env } from "../types.js";

const channelsRoute = new Hono<Env>();

channelsRoute.get("/w/:slug/api/channels", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const workspace = getWorkspace(c);

    const allChannels = await db.select().from(channels).where(eq(channels.workspaceId, workspace.id));

    return c.json({ channels: allChannels });
  } catch (error) {
    console.error("Error fetching channels:", error);
    return c.json({ error: "Failed to fetch channels" }, 500);
  }
});

channelsRoute.get("/w/:slug/api/channels/memberships", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const workspace = getWorkspace(c);

    const allChannels = await db.select().from(channels).where(eq(channels.workspaceId, workspace.id));
    const memberships = await db
      .select({ channelId: channelMembers.channelId })
      .from(channelMembers)
      .where(eq(channelMembers.userEmail, user.email));

    const myChannelIds = new Set(memberships.map((m) => m.channelId));
    const myChannels = allChannels.filter((ch) => myChannelIds.has(ch.id));
    const otherChannels = allChannels.filter((ch) => !myChannelIds.has(ch.id));

    return c.json({ myChannels, otherChannels });
  } catch (error) {
    console.error("Error fetching memberships:", error);
    return c.json({ error: "Failed to fetch memberships" }, 500);
  }
});

channelsRoute.get("/w/:slug/api/channels/:id/members", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const workspace = getWorkspace(c);

    const channelId = Number(c.req.param("id"));
    if (Number.isNaN(channelId)) {
      return c.json({ error: "Invalid channel ID" }, 400);
    }

    const channel = await db
      .select()
      .from(channels)
      .where(and(eq(channels.id, channelId), eq(channels.workspaceId, workspace.id)));
    if (channel.length === 0) {
      return c.json({ error: "Channel not found" }, 404);
    }

    const memberships = await db
      .select({ userEmail: channelMembers.userEmail })
      .from(channelMembers)
      .where(eq(channelMembers.channelId, channelId));

    const isMember = memberships.some((m) => m.userEmail === user.email);
    if (!isMember) {
      return c.json({ error: "Not a member of this channel" }, 403);
    }

    const memberEmails = memberships.map((m) => m.userEmail);
    const memberUsers =
      memberEmails.length > 0
        ? await db
            .select({ email: users.email, name: users.name })
            .from(users)
            .where(inArray(users.email, memberEmails))
        : [];

    return c.json({ members: memberUsers });
  } catch (error) {
    console.error("Error fetching channel members:", error);
    return c.json({ error: "Failed to fetch channel members" }, 500);
  }
});

channelsRoute.post("/w/:slug/api/channels", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const workspace = getWorkspace(c);

    const body = await c.req.json();
    const name = body.name?.trim();

    if (!name) {
      return c.json({ error: "Channel name is required" }, 400);
    }

    const existing = await db
      .select()
      .from(channels)
      .where(and(eq(channels.workspaceId, workspace.id), eq(channels.name, name)));
    if (existing.length > 0) {
      return c.json({ error: "Channel name already exists" }, 409);
    }

    const [created] = await db
      .insert(channels)
      .values({ name, workspaceId: workspace.id, createdByEmail: user.email })
      .returning();

    await db.insert(channelMembers).values({ channelId: created.id, userEmail: user.email });

    return c.json({ channel: created }, 201);
  } catch (error) {
    console.error("Error creating channel:", error);
    return c.json({ error: "Failed to create channel" }, 500);
  }
});

channelsRoute.post("/w/:slug/api/channels/:id/join", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const workspace = getWorkspace(c);

    const channelId = Number(c.req.param("id"));
    if (Number.isNaN(channelId)) {
      return c.json({ error: "Invalid channel ID" }, 400);
    }

    const channel = await db
      .select()
      .from(channels)
      .where(and(eq(channels.id, channelId), eq(channels.workspaceId, workspace.id)));
    if (channel.length === 0) {
      return c.json({ error: "Channel not found" }, 404);
    }

    const existingMember = await db
      .select()
      .from(channelMembers)
      .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userEmail, user.email)));

    if (existingMember.length > 0) {
      return c.json({ message: "Already a member" }, 200);
    }

    await db.insert(channelMembers).values({ channelId, userEmail: user.email });

    return c.json({ message: "Joined channel" }, 200);
  } catch (error) {
    console.error("Error joining channel:", error);
    return c.json({ error: "Failed to join channel" }, 500);
  }
});

channelsRoute.post("/w/:slug/api/channels/:id/leave", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const workspace = getWorkspace(c);

    const channelId = Number(c.req.param("id"));
    if (Number.isNaN(channelId)) {
      return c.json({ error: "Invalid channel ID" }, 400);
    }

    const channel = await db
      .select()
      .from(channels)
      .where(and(eq(channels.id, channelId), eq(channels.workspaceId, workspace.id)));
    if (channel.length === 0) {
      return c.json({ error: "Channel not found" }, 404);
    }

    if (channel[0].name === "general") {
      return c.json({ error: "Cannot leave #general" }, 403);
    }

    await db
      .delete(channelMembers)
      .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userEmail, user.email)));

    return c.json({ message: "Left channel" }, 200);
  } catch (error) {
    console.error("Error leaving channel:", error);
    return c.json({ error: "Failed to leave channel" }, 500);
  }
});

export { channelsRoute };
