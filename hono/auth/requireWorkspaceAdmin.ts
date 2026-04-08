import { createMiddleware } from "hono/factory";
import type { Env } from "../types.js";

export const requireWorkspaceAdmin = createMiddleware<Env>(async (c, next) => {
  const workspaceMember = c.get("workspaceMember");

  if (!workspaceMember || workspaceMember.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }

  await next();
});
