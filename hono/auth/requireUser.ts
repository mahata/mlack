import { createMiddleware } from "hono/factory";
import type { Bindings, User, Variables } from "../types.js";

export const requireUser = createMiddleware<{ Bindings: Bindings; Variables: Variables }>(async (c, next) => {
  const session = c.get("session");
  const user = session.get("user") as User | undefined;

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", user);
  await next();
});
