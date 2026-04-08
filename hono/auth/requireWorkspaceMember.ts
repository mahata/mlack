import { and, eq } from "drizzle-orm";
import { createMiddleware } from "hono/factory";
import { getDb, workspaceMembers, workspaces } from "../db/index.js";
import type { Env, User, WorkspaceMember } from "../types.js";

export const requireWorkspaceMember = createMiddleware<Env>(async (c, next) => {
  const session = c.get("session");
  const user = session.get("user") as User | undefined;

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", user);

  const slug = c.req.param("slug");
  if (!slug) {
    return c.json({ error: "Workspace slug is required" }, 400);
  }

  const db = getDb(c.env.DB);

  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.slug, slug));
  if (!workspace) {
    return c.json({ error: "Workspace not found" }, 404);
  }

  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userEmail, user.email)));

  if (!membership) {
    return c.json({ error: "Not a member of this workspace" }, 403);
  }

  c.set("workspace", workspace);
  c.set("workspaceMember", { ...membership, role: membership.role as WorkspaceMember["role"] });
  await next();
});
