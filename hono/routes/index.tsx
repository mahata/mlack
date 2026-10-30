import { Hono } from "hono";
import { AboutPage } from "../components/AboutPage.js";
import { ChatPage } from "../components/ChatPage.js";
import type { Env, User } from "../types.js";

const indexRoute = new Hono<Env>();

indexRoute.get("/", async (c) => {
  const user = c.get("user") as User | undefined;

  if (!user) {
    return c.redirect("/auth/login");
  }

  try {
    await c.env.DB.prepare(
      `INSERT INTO channel_members (channel_id, user_email)
       SELECT id, ?1 FROM channels WHERE name = 'general'
         AND NOT EXISTS (SELECT 1 FROM channel_members WHERE channel_id = channels.id AND user_email = ?1)`,
    )
      .bind(user.email)
      .run();
  } catch (error) {
    console.error("Error auto-joining #general:", error);
  }

  return c.html(ChatPage(user));
});

indexRoute.get("/about", (c) => c.html(AboutPage()));

export { indexRoute };
