import { Hono } from "hono";
import { AboutPage } from "../components/AboutPage.js";
import { ChatPage } from "../components/ChatPage.js";
import type { User, Variables } from "../types.js";

const index = new Hono<{ Variables: Variables }>();

index.get("/", async (c) => {
  const session = c.get("session");
  const user = session.get("user") as User | undefined;

  if (!user) {
    return c.redirect("/auth/google");
  }

  // Prefer X-Forwarded-Proto header if available
  const protoHeader = c.req.header("x-forwarded-proto");
  const protocol = protoHeader === "https" ? "wss:" : "ws:";
  const url = new URL(c.req.url);
  const wsUrl = `${protocol}//${url.host}/ws`;

  return c.html(`<!DOCTYPE html>${await ChatPage(wsUrl, user)}`);
});

index.get("/about", async (c) => {
  return c.html(`<!DOCTYPE html>${await AboutPage()}`);
});

export { index };
