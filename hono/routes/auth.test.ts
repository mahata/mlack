import { Hono } from "hono";
import type { Session } from "hono-sessions";
import { describe, expect, it, vi } from "vitest";
import { createTestApp } from "../testApp.js";
import type { Env } from "../types.js";
import { authRoute } from "./auth.js";

function createAuthApp() {
  const deleteSession = vi.fn();
  const app = new Hono<Env>();

  app.use("*", async (c, next) => {
    c.set("session", { get: vi.fn(), set: vi.fn(), deleteSession } as unknown as Session);
    await next();
  });

  app.route("/", authRoute);
  return { app, deleteSession };
}

describe("Auth routes", () => {
  it("should not serve Google login", async () => {
    const { app } = createTestApp({ authenticatedUser: null });

    const response = await app.request("/auth/google");

    expect(response.status).toBe(404);
  });

  it("should delete the session and redirect to the root page on logout", async () => {
    const { app, deleteSession } = createAuthApp();

    const response = await app.request("/auth/logout", { method: "POST" });

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/");
    expect(deleteSession).toHaveBeenCalledOnce();
  });
});
