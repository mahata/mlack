import { Hono } from "hono";
import type { Env } from "../types.js";

const authRoute = new Hono<Env>();

authRoute.get("/debug/session", async (c) => {
  if (c.env.NODE_ENV !== "development") {
    return c.json({ error: "Debug endpoint only available in development" }, 403);
  }
  const session = c.get("session");
  const user = session.get("user");
  return c.json({
    user,
    hasSession: !!session,
  });
});

authRoute.post("/auth/logout", async (c) => {
  const session = c.get("session");
  session.deleteSession();
  return c.redirect("/");
});

export { authRoute };
