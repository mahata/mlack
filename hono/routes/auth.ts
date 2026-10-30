import { Hono } from "hono";
import { endSession } from "../auth/session.js";
import type { Env } from "../types.js";

const authRoute = new Hono<Env>();

authRoute.post("/auth/logout", (c) => {
  endSession(c);
  return c.redirect("/");
});

export { authRoute };
