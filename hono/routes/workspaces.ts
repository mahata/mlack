import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { requireUser } from "../auth/requireUser.js";
import { getDb, workspaceMembers, workspaces } from "../db/index.js";
import type { Env } from "../types.js";

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

const workspacesRoute = new Hono<Env>();

workspacesRoute.get("/api/workspaces", requireUser, async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get("user");

    const userWorkspaces = await db
      .select({
        id: workspaces.id,
        name: workspaces.name,
        slug: workspaces.slug,
        createdByEmail: workspaces.createdByEmail,
        createdAt: workspaces.createdAt,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userEmail, user.email));

    return c.json({ workspaces: userWorkspaces });
  } catch (error) {
    console.error("Error fetching workspaces:", error);
    return c.json({ error: "Failed to fetch workspaces" }, 500);
  }
});

workspacesRoute.post("/api/workspaces", requireUser, async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get("user");

    const body = await c.req.json();
    const name = body.name?.trim();
    const slug = body.slug?.trim()?.toLowerCase();

    if (!name) {
      return c.json({ error: "Workspace name is required" }, 400);
    }

    if (!slug || !SLUG_REGEX.test(slug)) {
      return c.json(
        { error: "Slug must be 3-40 characters, lowercase alphanumeric and hyphens, cannot start or end with hyphen" },
        400,
      );
    }

    const existingBySlug = await db.select().from(workspaces).where(eq(workspaces.slug, slug));
    if (existingBySlug.length > 0) {
      return c.json({ error: "Workspace slug already exists" }, 409);
    }

    const [created] = await db.insert(workspaces).values({ name, slug, createdByEmail: user.email }).returning();

    await db.insert(workspaceMembers).values({
      workspaceId: created.id,
      userEmail: user.email,
      role: "admin",
    });

    return c.json({ workspace: created }, 201);
  } catch (error) {
    console.error("Error creating workspace:", error);
    return c.json({ error: "Failed to create workspace" }, 500);
  }
});

export { workspacesRoute };
