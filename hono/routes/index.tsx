import { Hono } from "hono";
import { ChatPage } from "../components/ChatPage";

const index = new Hono();

index.get("/", (c) => {
  return c.html(
    <>
      {"<!DOCTYPE html>"}
      <ChatPage />
    </>,
  );
});

export { index };
