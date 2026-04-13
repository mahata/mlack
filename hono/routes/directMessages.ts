import { and, desc, eq, or } from "drizzle-orm";
import { Hono } from "hono";
import { directConversations, directMessages, getDb, workspaceMembers } from "../db/index.js";
import { getUserNameByEmail, getUsersByEmails, getWorkspaceMember } from "../db/queries/index.js";
import { getWorkspace } from "../helpers/getWorkspace.js";
import type { Env } from "../types.js";

const directMessagesRoute = new Hono<Env>();

directMessagesRoute.get("/w/:slug/api/dm/conversations", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const workspace = getWorkspace(c);

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

    const otherUsers = await getUsersByEmails(db, otherEmails);

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
    const workspace = getWorkspace(c);

    const body = await c.req.json();
    const targetEmail = body.targetEmail?.trim();

    if (!targetEmail) {
      return c.json({ error: "targetEmail is required" }, 400);
    }

    if (targetEmail === user.email) {
      return c.json({ error: "Cannot start a DM with yourself" }, 400);
    }

    const targetMembership = await getWorkspaceMember(db, workspace.id, targetEmail);

    if (!targetMembership) {
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
      const otherUserName = (await getUserNameByEmail(db, otherEmail)) ?? otherEmail;

      return c.json({
        conversation: {
          id: conv.id,
          otherUserEmail: otherEmail,
          otherUserName,
          createdAt: conv.createdAt,
        },
      });
    }

    let created: (typeof existing)[0];
    try {
      [created] = await db
        .insert(directConversations)
        .values({
          workspaceId: workspace.id,
          user1Email,
          user2Email,
        })
        .returning();
    } catch (insertError) {
      const raceExisting = await db
        .select()
        .from(directConversations)
        .where(
          and(
            eq(directConversations.workspaceId, workspace.id),
            eq(directConversations.user1Email, user1Email),
            eq(directConversations.user2Email, user2Email),
          ),
        );

      if (raceExisting.length > 0) {
        const conv = raceExisting[0];
        const otherEmail = conv.user1Email === user.email ? conv.user2Email : conv.user1Email;
        const otherUserName = (await getUserNameByEmail(db, otherEmail)) ?? otherEmail;

        return c.json({
          conversation: {
            id: conv.id,
            otherUserEmail: otherEmail,
            otherUserName,
            createdAt: conv.createdAt,
          },
        });
      }

      throw insertError;
    }

    const otherEmail = created.user1Email === user.email ? created.user2Email : created.user1Email;
    const otherUserName = (await getUserNameByEmail(db, otherEmail)) ?? otherEmail;

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
    const workspace = getWorkspace(c);

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
    const workspace = getWorkspace(c);

    const members = await db
      .select({ userEmail: workspaceMembers.userEmail })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspace.id));

    const memberEmails = members.map((m) => m.userEmail).filter((email) => email !== user.email);

    const memberUsers = await getUsersByEmails(db, memberEmails);

    return c.json({ members: memberUsers });
  } catch (error) {
    console.error("Error fetching workspace members:", error);
    return c.json({ error: "Failed to fetch workspace members" }, 500);
  }
});

export { directMessagesRoute };
