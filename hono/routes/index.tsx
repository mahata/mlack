import { Hono } from "hono";
import { ChatPage } from "../components/ChatPage.js";

const index = new Hono();

index.get("/", async (c) => {
  // Construct WebSocket URL from request
  const url = new URL(c.req.url);
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${url.host}/ws`;

  return c.html(`<!DOCTYPE html>${await ChatPage(wsUrl)}`);
});

export { index };
