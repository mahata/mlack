import { Hono } from "hono";
import type { Env } from "../types.js";

const authRoute = new Hono<Env>();

authRoute.post("/auth/logout", async (c) => {
  const session = c.get("session");
  session.deleteSession();
  return c.redirect("/");
});

export { authRoute };
