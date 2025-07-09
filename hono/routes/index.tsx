import { Hono } from "hono";
import { ChatPage } from "../components/ChatPage.js";

const index = new Hono();

index.get("/", async (c) => {
  return c.html(`<!DOCTYPE html>${await ChatPage()}`);
});

export { index };
