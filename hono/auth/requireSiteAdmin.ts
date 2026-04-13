import { createMiddleware } from "hono/factory";
import type { Env, User } from "../types.js";

export const requireSiteAdmin = createMiddleware<Env>(async (c, next) => {
  const session = c.get("session");
  const user = session.get("user") as User | undefined;

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const siteAdminEmail = c.env.SITE_ADMIN_EMAIL;
  if (!siteAdminEmail) {
    console.error("SITE_ADMIN_EMAIL is not configured");
    return c.json({ error: "Site admin access required" }, 403);
  }

  if (user.email.trim().toLowerCase() !== siteAdminEmail.trim().toLowerCase()) {
    return c.json({ error: "Site admin access required" }, 403);
  }

  c.set("user", user);
  await next();
});
