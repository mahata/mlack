import { Hono } from "hono";
import { CHANNEL_COLUMNS, type Channel, getChannelById, isChannelMember } from "../db/queries.js";
import { parsePositiveInt } from "../helpers/parsePositiveInt.js";
import type { Env, User } from "../types.js";

const channelsRoute = new Hono<Env>();

channelsRoute.get("/api/channels/memberships", async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT ${CHANNEL_COLUMNS},
         EXISTS (SELECT 1 FROM channel_members WHERE channel_id = channels.id AND user_email = ?) AS isMember
       FROM channels`,
    )
      .bind(c.get("user").email)
      .all<Channel & { isMember: number }>();

    const myChannels: Channel[] = [];
    const otherChannels: Channel[] = [];
    for (const { isMember, ...channel } of results) {
      (isMember ? myChannels : otherChannels).push(channel);
    }

    return c.json({ myChannels, otherChannels });
  } catch (error) {
    console.error("Error fetching memberships:", error);
    return c.json({ error: "Failed to fetch memberships" }, 500);
  }
});

channelsRoute.get("/api/channels/:id/members", async (c) => {
  try {
    const channelId = parsePositiveInt(c.req.param("id"));
    if (!channelId) {
      return c.json({ error: "Invalid channel ID" }, 400);
    }

    if (!(await getChannelById(c.env.DB, channelId))) {
      return c.json({ error: "Channel not found" }, 404);
    }

    if (!(await isChannelMember(c.env.DB, channelId, c.get("user").email))) {
      return c.json({ error: "Not a member of this channel" }, 403);
    }

    const { results: members } = await c.env.DB.prepare(
      `SELECT users.email, users.name FROM channel_members
       JOIN users ON users.email = channel_members.user_email
       WHERE channel_members.channel_id = ?`,
    )
      .bind(channelId)
      .all<User>();

    return c.json({ members });
  } catch (error) {
    console.error("Error fetching channel members:", error);
    return c.json({ error: "Failed to fetch channel members" }, 500);
  }
});

channelsRoute.post("/api/channels", async (c) => {
  try {
    const user = c.get("user");
    const body = await c.req.json();
    const name = body.name?.trim();

    if (!name) {
      return c.json({ error: "Channel name is required" }, 400);
    }

    const created = await c.env.DB.prepare(
      `INSERT INTO channels (name, created_by_email) SELECT ?1, ?2 WHERE NOT EXISTS (SELECT 1 FROM channels WHERE name = ?1)
       RETURNING ${CHANNEL_COLUMNS}`,
    )
      .bind(name, user.email)
      .first<Channel>();
    if (!created) {
      return c.json({ error: "Channel name already exists" }, 409);
    }

    await c.env.DB.prepare("INSERT INTO channel_members (channel_id, user_email) VALUES (?, ?)")
      .bind(created.id, user.email)
      .run();

    return c.json({ channel: created }, 201);
  } catch (error) {
    console.error("Error creating channel:", error);
    return c.json({ error: "Failed to create channel" }, 500);
  }
});

channelsRoute.post("/api/channels/:id/join", async (c) => {
  try {
    const channelId = parsePositiveInt(c.req.param("id"));
    if (!channelId) {
      return c.json({ error: "Invalid channel ID" }, 400);
    }

    if (!(await getChannelById(c.env.DB, channelId))) {
      return c.json({ error: "Channel not found" }, 404);
    }

    const { meta } = await c.env.DB.prepare(
      `INSERT INTO channel_members (channel_id, user_email) SELECT ?1, ?2
       WHERE NOT EXISTS (SELECT 1 FROM channel_members WHERE channel_id = ?1 AND user_email = ?2)`,
    )
      .bind(channelId, c.get("user").email)
      .run();

    return c.json({ message: meta.changes > 0 ? "Joined channel" : "Already a member" });
  } catch (error) {
    console.error("Error joining channel:", error);
    return c.json({ error: "Failed to join channel" }, 500);
  }
});

channelsRoute.post("/api/channels/:id/leave", async (c) => {
  try {
    const channelId = parsePositiveInt(c.req.param("id"));
    if (!channelId) {
      return c.json({ error: "Invalid channel ID" }, 400);
    }

    const channel = await getChannelById(c.env.DB, channelId);
    if (!channel) {
      return c.json({ error: "Channel not found" }, 404);
    }

    if (channel.name === "general") {
      return c.json({ error: "Cannot leave #general" }, 403);
    }

    await c.env.DB.prepare("DELETE FROM channel_members WHERE channel_id = ? AND user_email = ?")
      .bind(channelId, c.get("user").email)
      .run();

    return c.json({ message: "Left channel" });
  } catch (error) {
    console.error("Error leaving channel:", error);
    return c.json({ error: "Failed to leave channel" }, 500);
  }
});

export { channelsRoute };
