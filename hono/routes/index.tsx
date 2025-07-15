import { Hono } from "hono";
import { ChatPage } from "../components/ChatPage.js";
import type { Variables } from "../types.js";

const index = new Hono<{ Variables: Variables }>();

index.get("/", async (c) => {
  console.log("Index route accessed");

  const session = c.get("session");
  const user = session.get("user") as { email?: string; name?: string; picture?: string } | undefined;

  console.log("Session user:", user);

  // Redirect to Google login if user is not authenticated
  if (!user) {
    console.log("No user found in session, redirecting to Google auth");
    return c.redirect("/auth/google");
  }

  console.log("User authenticated, showing chat page");

  // Prefer X-Forwarded-Proto header if available
  const protoHeader = c.req.header("x-forwarded-proto");
  const protocol = protoHeader === "https" ? "wss:" : "ws:";
  const url = new URL(c.req.url);
  const wsUrl = `${protocol}//${url.host}/ws`;

  return c.html(`<!DOCTYPE html>${await ChatPage(wsUrl, user)}`);
});

export { index };
