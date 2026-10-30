import { Hono } from "hono";
import { AboutPage } from "../components/AboutPage.js";
import { ChatPage } from "../components/ChatPage.js";
import { getDb } from "../db/index.js";
import { ensureGeneralChannelMembership } from "../db/queries/index.js";
import { renderPage } from "../helpers/renderPage.js";
import type { Env, User } from "../types.js";

const indexRoute = new Hono<Env>();

indexRoute.get("/", async (c) => {
  const user = c.get("user") as User | undefined;

  if (!user) {
    return c.redirect("/auth/login");
  }

  const protoHeader = c.req.header("x-forwarded-proto");
  const protocol = protoHeader === "https" ? "wss:" : "ws:";
  const url = new URL(c.req.url);
  const wsUrl = `${protocol}//${url.host}/ws`;

  try {
    const db = getDb(c.env.DB);
    await ensureGeneralChannelMembership(db, user.email);
  } catch (error) {
    console.error("Error auto-joining #general:", error);
  }

  return renderPage(c, ChatPage(wsUrl, user));
});

indexRoute.get("/about", async (c) => {
  return renderPage(c, AboutPage());
});

export { indexRoute };
