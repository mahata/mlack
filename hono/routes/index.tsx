import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { AboutPage } from "../components/AboutPage.js";
import { ChatPage } from "../components/ChatPage.js";
import { WorkspacesPage } from "../components/WorkspacesPage.js";
import { channelMembers, channels, getDb, workspaceMembers, workspaces } from "../db/index.js";
import { renderPage } from "../helpers/renderPage.js";
import type { Env, User } from "../types.js";

const index = new Hono<Env>();

index.get("/", async (c) => {
  const session = c.get("session");
  const user = session.get("user") as User | undefined;

  if (!user) {
    return c.redirect("/auth/login");
  }

  try {
    const db = getDb(c.env.DB);

    const memberships = await db
      .select({ workspaceId: workspaceMembers.workspaceId, role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userEmail, user.email));

    if (memberships.length === 0) {
      const [defaultWorkspace] = await db.select().from(workspaces).where(eq(workspaces.slug, "default"));
      if (defaultWorkspace) {
        const existingMembers = await db
          .select({ userEmail: workspaceMembers.userEmail })
          .from(workspaceMembers)
          .where(eq(workspaceMembers.workspaceId, defaultWorkspace.id));

        const role = existingMembers.length === 0 ? "admin" : "member";

        await db.insert(workspaceMembers).values({
          workspaceId: defaultWorkspace.id,
          userEmail: user.email,
          role,
        });
        return c.redirect(`/w/${defaultWorkspace.slug}`);
      }
      return renderPage(c, WorkspacesPage(user, []));
    }

    if (memberships.length === 1) {
      const [workspace] = await db.select().from(workspaces).where(eq(workspaces.id, memberships[0].workspaceId));
      if (workspace) {
        return c.redirect(`/w/${workspace.slug}`);
      }
    }

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

    return renderPage(c, WorkspacesPage(user, userWorkspaces));
  } catch (error) {
    console.error("Error loading workspaces:", error);
    return renderPage(c, WorkspacesPage(user, []), 500);
  }
});

index.get("/w/:slug", async (c) => {
  const user = c.get("user");
  const workspace = c.get("workspace")!;

  const protoHeader = c.req.header("x-forwarded-proto");
  const protocol = protoHeader === "https" ? "wss:" : "ws:";
  const url = new URL(c.req.url);
  const wsUrl = `${protocol}//${url.host}/w/${workspace.slug}/ws`;

  try {
    const db = getDb(c.env.DB);
    const [generalChannel] = await db
      .select()
      .from(channels)
      .where(and(eq(channels.workspaceId, workspace.id), eq(channels.name, "general")));

    if (generalChannel) {
      const existingMembership = await db
        .select()
        .from(channelMembers)
        .where(and(eq(channelMembers.channelId, generalChannel.id), eq(channelMembers.userEmail, user.email)));

      if (existingMembership.length === 0) {
        await db.insert(channelMembers).values({
          channelId: generalChannel.id,
          userEmail: user.email,
        });
      }
    }
  } catch (error) {
    console.error("Error auto-joining #general:", error);
  }

  return renderPage(c, ChatPage(wsUrl, user, workspace));
});

index.get("/about", async (c) => {
  return renderPage(c, AboutPage());
});

export { index };
