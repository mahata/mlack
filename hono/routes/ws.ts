import { Hono } from "hono";
import type { Env, User } from "../types.js";

export function createWsRoute() {
  const ws = new Hono<Env>();

  ws.get("/ws", async (c) => {
    const upgradeHeader = c.req.header("Upgrade");
    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return c.text("Expected Upgrade: websocket", 426);
    }

    const session = c.get("session");
    const user = session.get("user") as User | undefined;

    if (!user) {
      return c.text("Unauthorized", 401);
    }

    const stub = c.env.CHAT_ROOM.getByName("main");

    const url = new URL(c.req.url);
    url.searchParams.set("userEmail", user.email);
    url.searchParams.set("userName", user.name);

    const doRequest = new Request(url.toString(), c.req.raw);
    return stub.fetch(doRequest);
  });

  return ws;
}
