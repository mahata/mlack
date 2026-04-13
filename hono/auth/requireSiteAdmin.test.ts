import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type { Env } from "../types.js";
import { requireSiteAdmin } from "./requireSiteAdmin.js";

function createTestApp(options: { userEmail?: string; siteAdminEmail?: string }) {
  const app = new Hono<Env>();

  app.use("*", async (c, next) => {
    const mockSession = {
      get: vi.fn().mockReturnValue(options.userEmail ? { email: options.userEmail, name: "Test User" } : null),
      set: vi.fn(),
      deleteSession: vi.fn(),
    };
    c.set("session", mockSession as never);

    if (!c.env) {
      (c as never as Record<string, unknown>).env = {};
    }
    c.env.SITE_ADMIN_EMAIL = options.siteAdminEmail ?? "";
    await next();
  });

  app.use("*", requireSiteAdmin);
  app.get("/site-admin", (c) => c.json({ ok: true }));

  return app;
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
