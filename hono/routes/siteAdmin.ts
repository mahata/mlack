import { Hono } from "hono";
import { SiteAdminPage } from "../components/SiteAdminPage.js";
import { parsePositiveInt } from "../helpers/parsePositiveInt.js";
import type { Env, User } from "../types.js";

const FLAG_VALIDATORS = new Map([["maxTotalUploadBytes", (value: string) => parsePositiveInt(value) !== null]]);

const siteAdminRoute = new Hono<Env>();

siteAdminRoute.get("/site-admin", async (c) => {
  try {
    const [{ results: users }, { results: flags }] = await Promise.all([
      c.env.DB.prepare("SELECT email, name FROM users").all<User>(),
      c.env.DB.prepare(
        "SELECT user_email AS userEmail, flag_key AS flagKey, flag_value AS flagValue FROM user_feature_flags",
      ).all<{ userEmail: string; flagKey: string; flagValue: string }>(),
    ]);
    const usersWithFlags = users.map((user) => ({
      ...user,
      flags: flags.filter((flag) => flag.userEmail === user.email),
    }));
    return c.html(`<!DOCTYPE html>${await SiteAdminPage(c.get("user"), usersWithFlags)}`);
  } catch (error) {
    console.error("Error rendering site admin page:", error);
    return c.json({ error: "Failed to load site admin" }, 500);
  }
});

siteAdminRoute.put("/site-admin/api/users/:email/flags/:key", async (c) => {
  try {
    const email = c.req.param("email");
    const flagKey = c.req.param("key");

    const isValidValue = FLAG_VALIDATORS.get(flagKey);
    if (!isValidValue) {
      return c.json({ error: `Unknown flag key: ${flagKey}` }, 400);
    }

    const body = await c.req.json();
    const flagValue = typeof body.value === "string" ? body.value.trim() : "";
    if (!flagValue) {
      return c.json({ error: "value is required and must be a non-empty string" }, 400);
    }

    if (!isValidValue(flagValue)) {
      return c.json({ error: `Invalid value for ${flagKey}` }, 400);
    }

    if (!(await c.env.DB.prepare("SELECT 1 FROM users WHERE email = ?").bind(email).first())) {
      return c.json({ error: "User not found" }, 404);
    }

    await c.env.DB.prepare(
      `INSERT INTO user_feature_flags (user_email, flag_key, flag_value, granted_by) VALUES (?, ?, ?, ?)
       ON CONFLICT (user_email, flag_key) DO UPDATE SET flag_value = excluded.flag_value, granted_by = excluded.granted_by`,
    )
      .bind(email, flagKey, flagValue, c.get("user").email)
      .run();

    return c.json({ message: "Flag set" });
  } catch (error) {
    console.error("Error setting feature flag:", error);
    return c.json({ error: "Failed to set flag" }, 500);
  }
});

siteAdminRoute.delete("/site-admin/api/users/:email/flags/:key", async (c) => {
  try {
    const { meta } = await c.env.DB.prepare("DELETE FROM user_feature_flags WHERE user_email = ? AND flag_key = ?")
      .bind(c.req.param("email"), c.req.param("key"))
      .run();
    if (meta.changes === 0) {
      return c.json({ error: "Flag not found" }, 404);
    }

    return c.json({ message: "Flag removed" });
  } catch (error) {
    console.error("Error deleting feature flag:", error);
    return c.json({ error: "Failed to delete flag" }, 500);
  }
});

export { siteAdminRoute };
