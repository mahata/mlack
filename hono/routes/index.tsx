import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { AboutPage } from "../components/AboutPage.js";
import { ChatPage } from "../components/ChatPage.js";
import { channelMembers, channels, getDb } from "../db/index.js";
import { renderPage } from "../helpers/renderPage.js";
import type { Env, User } from "../types.js";

const index = new Hono<Env>();

index.get("/", async (c) => {
  const session = c.get("session");
  const user = session.get("user") as User | undefined;

  if (!user) {
    return c.redirect("/auth/login");
  }

  const protoHeader = c.req.header("x-forwarded-proto");
  const protocol = protoHeader === "https" ? "wss:" : "ws:";
  const url = new URL(c.req.url);
  const wsUrl = `${protocol}//${url.host}/ws`;

  try {
    const db = getDb(c.env.DB);
    const [generalChannel] = await db.select().from(channels).where(eq(channels.name, "general"));

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

  return renderPage(c, ChatPage(wsUrl, user));
});

index.get("/about", async (c) => {
  return renderPage(c, AboutPage());
});

export { index };
