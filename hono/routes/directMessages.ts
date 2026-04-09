import { and, desc, eq, or } from "drizzle-orm";
import { Hono } from "hono";
import { directConversations, directMessages, getDb, users, workspaceMembers } from "../db/index.js";
import type { Env } from "../types.js";

const directMessagesRoute = new Hono<Env>();

directMessagesRoute.get("/w/:slug/api/dm/conversations", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const workspace = c.get("workspace")!;

    const conversations = await db
      .select()
      .from(directConversations)
      .where(
        and(
          eq(directConversations.workspaceId, workspace.id),
          or(eq(directConversations.user1Email, user.email), eq(directConversations.user2Email, user.email)),
        ),
      );

    const otherEmails = conversations.map((conv) =>
      conv.user1Email === user.email ? conv.user2Email : conv.user1Email,
    );

    const otherUsers =
      otherEmails.length > 0
        ? await db
            .select({ email: users.email, name: users.name })
            .from(users)
            .where(or(...otherEmails.map((email) => eq(users.email, email))))
        : [];

    const userMap = new Map(otherUsers.map((u) => [u.email, u.name]));

    const result = conversations.map((conv) => {
      const otherEmail = conv.user1Email === user.email ? conv.user2Email : conv.user1Email;
      return {
        id: conv.id,
        otherUserEmail: otherEmail,
        otherUserName: userMap.get(otherEmail) || otherEmail,
        createdAt: conv.createdAt,
      };
    });

    return c.json({ conversations: result });
  } catch (error) {
    console.error("Error fetching DM conversations:", error);
    return c.json({ error: "Failed to fetch conversations" }, 500);
  }
});

directMessagesRoute.post("/w/:slug/api/dm/conversations", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const workspace = c.get("workspace")!;

    const body = await c.req.json();
    const targetEmail = body.targetEmail?.trim();

    if (!targetEmail) {
      return c.json({ error: "targetEmail is required" }, 400);
    }

    if (targetEmail === user.email) {
      return c.json({ error: "Cannot start a DM with yourself" }, 400);
    }

    const targetMembership = await db
      .select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspace.id), eq(workspaceMembers.userEmail, targetEmail)));

    if (targetMembership.length === 0) {
      return c.json({ error: "User is not a member of this workspace" }, 404);
    }

    const [user1Email, user2Email] = user.email < targetEmail ? [user.email, targetEmail] : [targetEmail, user.email];

    const existing = await db
      .select()
      .from(directConversations)
      .where(
        and(
          eq(directConversations.workspaceId, workspace.id),
          eq(directConversations.user1Email, user1Email),
          eq(directConversations.user2Email, user2Email),
        ),
      );

    if (existing.length > 0) {
      const conv = existing[0];
      const otherEmail = conv.user1Email === user.email ? conv.user2Email : conv.user1Email;
      const targetUser = await db.select({ name: users.name }).from(users).where(eq(users.email, otherEmail));
      const otherUserName = targetUser.length > 0 ? targetUser[0].name : otherEmail;

      return c.json({
        conversation: {
          id: conv.id,
          otherUserEmail: otherEmail,
          otherUserName,
          createdAt: conv.createdAt,
        },
      });
    }

    const [created] = await db
      .insert(directConversations)
      .values({
        workspaceId: workspace.id,
        user1Email,
        user2Email,
      })
      .returning();

    const otherEmail = created.user1Email === user.email ? created.user2Email : created.user1Email;
    const targetUser = await db.select({ name: users.name }).from(users).where(eq(users.email, otherEmail));
    const otherUserName = targetUser.length > 0 ? targetUser[0].name : otherEmail;

    return c.json(
      {
        conversation: {
          id: created.id,
          otherUserEmail: otherEmail,
          otherUserName,
          createdAt: created.createdAt,
        },
      },
      201,
    );
  } catch (error) {
    console.error("Error creating DM conversation:", error);
    return c.json({ error: "Failed to create conversation" }, 500);
  }
});

directMessagesRoute.get("/w/:slug/api/dm/conversations/:id/messages", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const workspace = c.get("workspace")!;

    const conversationId = Number(c.req.param("id"));
    if (Number.isNaN(conversationId)) {
      return c.json({ error: "Invalid conversation ID" }, 400);
    }

    const conversation = await db
      .select()
      .from(directConversations)
      .where(and(eq(directConversations.id, conversationId), eq(directConversations.workspaceId, workspace.id)));

    if (conversation.length === 0) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    const conv = conversation[0];
    if (conv.user1Email !== user.email && conv.user2Email !== user.email) {
      return c.json({ error: "Not a participant in this conversation" }, 403);
    }

    const latestMessages = await db
      .select()
      .from(directMessages)
      .where(eq(directMessages.conversationId, conversationId))
      .orderBy(desc(directMessages.createdAt))
      .limit(100);

    return c.json({ messages: latestMessages.reverse() });
  } catch (error) {
    console.error("Error fetching DM messages:", error);
    return c.json({ error: "Failed to fetch messages" }, 500);
  }
});

directMessagesRoute.get("/w/:slug/api/dm/workspace-members", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const workspace = c.get("workspace")!;

    const members = await db
      .select({ userEmail: workspaceMembers.userEmail })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspace.id));

    const memberEmails = members.map((m) => m.userEmail).filter((email) => email !== user.email);

    const memberUsers =
      memberEmails.length > 0
        ? await db
            .select({ email: users.email, name: users.name })
            .from(users)
            .where(or(...memberEmails.map((email) => eq(users.email, email))))
        : [];

    return c.json({ members: memberUsers });
  } catch (error) {
    console.error("Error fetching workspace members:", error);
    return c.json({ error: "Failed to fetch workspace members" }, 500);
  }
});

export { directMessagesRoute };
