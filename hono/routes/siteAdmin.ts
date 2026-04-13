import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { SiteAdminPage } from "../components/SiteAdminPage.js";
import { getDb, users } from "../db/index.js";
import { deleteUserFeatureFlag, getAllFeatureFlagsGroupedByUser, setUserFeatureFlag } from "../db/queries/index.js";
import type { Env } from "../types.js";

const VALID_FLAGS: Record<string, (value: string) => boolean> = {
  maxTotalUploadBytes: (v) => {
    const n = Number(v);
    return Number.isFinite(n) && Number.isInteger(n) && n > 0;
  },
};

async function listUsersWithFlags(db: ReturnType<typeof getDb>) {
  const [allUsers, flagsByUser] = await Promise.all([
    db.select({ email: users.email, name: users.name }).from(users),
    getAllFeatureFlagsGroupedByUser(db),
  ]);

  return allUsers.map((u) => ({
    email: u.email,
    name: u.name,
    flags: flagsByUser.get(u.email) ?? [],
  }));
}

const siteAdminRoute = new Hono<Env>();

siteAdminRoute.get("/site-admin", async (c) => {
  try {
    const user = c.get("user");
    const db = getDb(c.env.DB);
    const usersWithFlags = await listUsersWithFlags(db);
    return c.html(`<!DOCTYPE html>${await SiteAdminPage(user, usersWithFlags)}`);
  } catch (error) {
    console.error("Error rendering site admin page:", error);
    return c.json({ error: "Failed to load site admin" }, 500);
  }
});

siteAdminRoute.get("/site-admin/api/users", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const usersWithFlags = await listUsersWithFlags(db);
    return c.json({ users: usersWithFlags });
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ error: "Failed to fetch users" }, 500);
  }
});

siteAdminRoute.put("/site-admin/api/users/:email/flags/:key", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const admin = c.get("user");
    const email = c.req.param("email");
    const flagKey = c.req.param("key");

    const validator = VALID_FLAGS[flagKey];
    if (!validator) {
      return c.json({ error: `Unknown flag key: ${flagKey}` }, 400);
    }

    const body = await c.req.json();
    const flagValue = body.value;

    if (typeof flagValue !== "string" || flagValue.trim() === "") {
      return c.json({ error: "value is required and must be a non-empty string" }, 400);
    }

    if (!validator(flagValue.trim())) {
      return c.json({ error: `Invalid value for ${flagKey}` }, 400);
    }

    const [existingUser] = await db.select({ email: users.email }).from(users).where(eq(users.email, email));
    if (!existingUser) {
      return c.json({ error: "User not found" }, 404);
    }

    await setUserFeatureFlag(db, email, flagKey, flagValue.trim(), admin.email);

    return c.json({ message: "Flag set" });
  } catch (error) {
    console.error("Error setting feature flag:", error);
    return c.json({ error: "Failed to set flag" }, 500);
  }
});

siteAdminRoute.delete("/site-admin/api/users/:email/flags/:key", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const email = c.req.param("email");
    const flagKey = c.req.param("key");

    const deleted = await deleteUserFeatureFlag(db, email, flagKey);
    if (!deleted) {
      return c.json({ error: "Flag not found" }, 404);
    }

    return c.json({ message: "Flag removed" });
  } catch (error) {
    console.error("Error deleting feature flag:", error);
    return c.json({ error: "Failed to delete flag" }, 500);
  }
});

export { siteAdminRoute };
