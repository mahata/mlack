import { createMiddleware } from "hono/factory";
import type { Env } from "../types.js";

export const requireUser = createMiddleware<Env>(async (c, next) => {
  if (!c.get("user")) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  await next();
});
