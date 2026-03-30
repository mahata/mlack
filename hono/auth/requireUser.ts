import { createMiddleware } from "hono/factory";
import type { Env, User } from "../types.js";

export const requireUser = createMiddleware<Env>(async (c, next) => {
  const session = c.get("session");
  const user = session.get("user") as User | undefined;

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", user);
  await next();
});
