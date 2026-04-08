import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { requireWorkspaceAdmin } from "../auth/requireWorkspaceAdmin.js";
import { requireWorkspaceMember } from "../auth/requireWorkspaceMember.js";
import { getDb, workspaceInvites, workspaceMembers } from "../db/index.js";
import type { Env } from "../types.js";

const INVITE_EXPIRY_MS = 60 * 60 * 1000;

const workspaceAdminRoute = new Hono<Env>();

workspaceAdminRoute.post("/w/:slug/admin/invites", requireWorkspaceMember, requireWorkspaceAdmin, async (c) => {
  try {
    const db = getDb(c.env.DB);
    const workspace = c.get("workspace");
    const user = c.get("user");

    const code = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS).toISOString();

    const [invite] = await db
      .insert(workspaceInvites)
      .values({
        workspaceId: workspace.id,
        code,
        createdByEmail: user.email,
        expiresAt,
      })
      .returning();

    return c.json(
      {
        invite: {
          ...invite,
          url: `/w/${workspace.slug}/invite/${code}`,
        },
      },
      201,
    );
  } catch (error) {
    console.error("Error creating invite:", error);
    return c.json({ error: "Failed to create invite" }, 500);
  }
});

workspaceAdminRoute.get("/w/:slug/admin/invites", requireWorkspaceMember, requireWorkspaceAdmin, async (c) => {
  try {
    const db = getDb(c.env.DB);
    const workspace = c.get("workspace");

    const invites = await db.select().from(workspaceInvites).where(eq(workspaceInvites.workspaceId, workspace.id));

    const now = new Date().toISOString();
    const activeInvites = invites.filter((inv) => inv.expiresAt > now);

    return c.json({ invites: activeInvites });
  } catch (error) {
    console.error("Error fetching invites:", error);
    return c.json({ error: "Failed to fetch invites" }, 500);
  }
});

workspaceAdminRoute.delete("/w/:slug/admin/invites/:code", requireWorkspaceMember, requireWorkspaceAdmin, async (c) => {
  try {
    const db = getDb(c.env.DB);
    const workspace = c.get("workspace");
    const code = c.req.param("code");

    const deleted = await db
      .delete(workspaceInvites)
      .where(and(eq(workspaceInvites.workspaceId, workspace.id), eq(workspaceInvites.code, code)))
      .returning();

    if (deleted.length === 0) {
      return c.json({ error: "Invite not found" }, 404);
    }

    return c.json({ message: "Invite revoked" });
  } catch (error) {
    console.error("Error revoking invite:", error);
    return c.json({ error: "Failed to revoke invite" }, 500);
  }
});

workspaceAdminRoute.get("/w/:slug/admin/members", requireWorkspaceMember, requireWorkspaceAdmin, async (c) => {
  try {
    const db = getDb(c.env.DB);
    const workspace = c.get("workspace");

    const members = await db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspace.id));

    return c.json({ members });
  } catch (error) {
    console.error("Error fetching workspace members:", error);
    return c.json({ error: "Failed to fetch workspace members" }, 500);
  }
});

workspaceAdminRoute.patch("/w/:slug/admin/members/:email", requireWorkspaceMember, requireWorkspaceAdmin, async (c) => {
  try {
    const db = getDb(c.env.DB);
    const workspace = c.get("workspace");
    const email = c.req.param("email");

    const body = await c.req.json();
    const role = body.role;

    if (role !== "admin" && role !== "member") {
      return c.json({ error: "Role must be 'admin' or 'member'" }, 400);
    }

    const updated = await db
      .update(workspaceMembers)
      .set({ role })
      .where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userEmail, email)))
      .returning();

    if (updated.length === 0) {
      return c.json({ error: "Member not found" }, 404);
    }

    return c.json({ member: updated[0] });
  } catch (error) {
    console.error("Error updating member role:", error);
    return c.json({ error: "Failed to update member role" }, 500);
  }
});

export { workspaceAdminRoute };
