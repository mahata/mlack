import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { Env } from "../types.js";
import { requireSiteAdmin } from "./requireSiteAdmin.js";

function createTestApp(options: { userEmail?: string; siteAdminEmail?: string }) {
  const app = new Hono<Env>();

  app.use(async (c, next) => {
    if (options.userEmail) {
      c.set("user", { email: options.userEmail, name: "Test User" });
    }
    await next();
  });
  app.use(requireSiteAdmin);
  app.get("/site-admin", (c) => c.json({ ok: true }));

  return { request: (path: string) => app.request(path, {}, { SITE_ADMIN_EMAIL: options.siteAdminEmail ?? "" }) };
}

describe("requireSiteAdmin", () => {
  it("should return 401 when no user is logged in", async () => {
    const app = createTestApp({ siteAdminEmail: "admin@example.com" });
    const response = await app.request("/site-admin");

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("should return 403 when user is not the site admin", async () => {
    const app = createTestApp({
      userEmail: "user@example.com",
      siteAdminEmail: "admin@example.com",
    });
    const response = await app.request("/site-admin");

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body).toEqual({ error: "Site admin access required" });
  });

  it("should return 403 when SITE_ADMIN_EMAIL is not configured", async () => {
    const app = createTestApp({
      userEmail: "user@example.com",
      siteAdminEmail: "",
    });
    const response = await app.request("/site-admin");

    expect(response.status).toBe(403);
  });

  it("should allow the site admin through", async () => {
    const app = createTestApp({
      userEmail: "admin@example.com",
      siteAdminEmail: "admin@example.com",
    });
    const response = await app.request("/site-admin");

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ ok: true });
  });
});
