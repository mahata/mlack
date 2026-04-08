import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { requireUser } from "../auth/requireUser.js";
import { channelMembers, channels, getDb, workspaceInvites, workspaceMembers, workspaces } from "../db/index.js";
import type { Env } from "../types.js";

const workspaceInviteRoute = new Hono<Env>();

workspaceInviteRoute.get("/w/:slug/invite/:code", requireUser, async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const slug = c.req.param("slug");
    const code = c.req.param("code");

    const [workspace] = await db.select().from(workspaces).where(eq(workspaces.slug, slug));
    if (!workspace) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    const [invite] = await db
      .select()
      .from(workspaceInvites)
      .where(and(eq(workspaceInvites.workspaceId, workspace.id), eq(workspaceInvites.code, code)));

    if (!invite) {
      return c.json({ error: "Invalid invite link" }, 404);
    }

    if (new Date(invite.expiresAt) < new Date()) {
      return c.json({ error: "Invite link has expired" }, 410);
    }

    const [existingMember] = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userEmail, user.email)));

    if (!existingMember) {
      await db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userEmail: user.email,
        role: "member",
      });

      const [generalChannel] = await db
        .select()
        .from(channels)
        .where(and(eq(channels.workspaceId, workspace.id), eq(channels.name, "general")));

      if (generalChannel) {
        const [existingChannelMember] = await db
          .select()
          .from(channelMembers)
          .where(and(eq(channelMembers.channelId, generalChannel.id), eq(channelMembers.userEmail, user.email)));

        if (!existingChannelMember) {
          await db.insert(channelMembers).values({
            channelId: generalChannel.id,
            userEmail: user.email,
          });
        }
      }
    }

    return c.redirect(`/w/${workspace.slug}`);
  } catch (error) {
    console.error("Error accepting invite:", error);
    return c.json({ error: "Failed to accept invite" }, 500);
  }
});

export { workspaceInviteRoute };
