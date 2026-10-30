import { Hono } from "hono";
import { sign } from "hono/jwt";
import { describe, expect, it } from "vitest";
import type { Env } from "../types.js";
import { createSessionToken, endSession, sessionMiddleware } from "./session.js";

const SESSION_SECRET = "session-test-secret";
const USER = { email: "user@example.com", name: "User" };

const app = new Hono<Env>();
app.use(sessionMiddleware);
app.get("/me", (c) => c.json({ user: c.get("user") ?? null }));
app.post("/logout", (c) => {
  endSession(c);
  return c.body(null, 204);
});

function request(path: string, options: { token?: string; method?: string; nodeEnv?: string } = {}) {
  const headers = options.token ? { Cookie: `session=${options.token}` } : undefined;
  return app.request(
    path,
    { method: options.method, headers },
    { SESSION_SECRET, NODE_ENV: options.nodeEnv ?? "test" },
  );
}

describe("sessionMiddleware", () => {
  it("treats requests without a session cookie as anonymous", async () => {
    const response = await request("/me");

    expect(await response.json()).toEqual({ user: null });
    expect(response.headers.has("Set-Cookie")).toBe(false);
  });

  it("restores the user from a valid session cookie and extends the session", async () => {
    const response = await request("/me", { token: await createSessionToken(USER, SESSION_SECRET) });

    expect(await response.json()).toEqual({ user: USER });
    expect(response.headers.get("Set-Cookie")).toMatch(/^session=[^;]+; Path=\/; HttpOnly; SameSite=Lax$/);
  });

  it("marks the refreshed cookie as Secure in production", async () => {
    const response = await request("/me", {
      token: await createSessionToken(USER, SESSION_SECRET),
      nodeEnv: "production",
    });

    expect(response.headers.get("Set-Cookie")).toContain("; Secure");
  });

  it("ignores cookies signed with a different secret", async () => {
    const response = await request("/me", { token: await createSessionToken(USER, "another-secret") });

    expect(await response.json()).toEqual({ user: null });
  });

  it("ignores expired session cookies", async () => {
    const expiredToken = await sign({ ...USER, exp: Math.floor(Date.now() / 1000) - 1 }, SESSION_SECRET, "HS256");

    const response = await request("/me", { token: expiredToken });

    expect(await response.json()).toEqual({ user: null });
  });

  it("does not re-issue the session when the handler ends it", async () => {
    const response = await request("/logout", {
      method: "POST",
      token: await createSessionToken(USER, SESSION_SECRET),
    });

    expect(response.headers.getSetCookie()).toEqual([expect.stringMatching(/^session=; Max-Age=0;/)]);
  });

  it("fails when SESSION_SECRET is missing", async () => {
    const response = await app.request("/me", {}, { NODE_ENV: "test" });

    expect(response.status).toBe(500);
  });
});
