import { Hono } from "hono";
import { ChatPage } from "../components/ChatPage.js";

const index = new Hono();

index.get("/", async (c) => {
  // Prefer X-Forwarded-Proto header if available
  const protoHeader = c.req.header("x-forwarded-proto");
  const protocol = protoHeader === "https" ? "wss:" : "ws:";
  const url = new URL(c.req.url);
  const wsUrl = `${protocol}//${url.host}/ws`;

  return c.html(`<!DOCTYPE html>${await ChatPage(wsUrl)}`);
});

export { index };
