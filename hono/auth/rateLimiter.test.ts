import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../types.js";
import { _resetStores, createRateLimiter } from "./rateLimiter.js";

function createTestApp(storeKey: string, maxRequests: number, windowMs: number) {
  const app = new Hono<Env>();
  app.use("/test", createRateLimiter(storeKey, { windowMs, maxRequests }));
  app.post("/test", (c) => c.json({ ok: true }));
  return app;
}

function makeRequest(app: Hono<Env>, ip = "1.2.3.4") {
  return app.request("/test", {
    method: "POST",
    headers: { "cf-connecting-ip": ip },
  });
}

afterEach(() => {
  _resetStores();
  vi.useRealTimers();
});

describe("createRateLimiter", () => {
  it("should allow requests under the limit", async () => {
    const app = createTestApp("test-under", 3, 60_000);

    const res1 = await makeRequest(app);
    const res2 = await makeRequest(app);
    const res3 = await makeRequest(app);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(200);
  });

  it("should return 429 when limit is exceeded", async () => {
    const app = createTestApp("test-exceeded", 2, 60_000);

    await makeRequest(app);
    await makeRequest(app);
    const res = await makeRequest(app);

    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("Too many requests");
  });

  it("should track IPs independently", async () => {
    const app = createTestApp("test-ips", 1, 60_000);

    const res1 = await makeRequest(app, "10.0.0.1");
    const res2 = await makeRequest(app, "10.0.0.2");
    const blocked = await makeRequest(app, "10.0.0.1");

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(blocked.status).toBe(429);
  });

  it("should allow requests after the window expires", async () => {
    vi.useFakeTimers();
    const app = createTestApp("test-expire", 1, 1000);

    const res1 = await makeRequest(app);
    expect(res1.status).toBe(200);

    const blocked = await makeRequest(app);
    expect(blocked.status).toBe(429);

    await vi.advanceTimersByTimeAsync(1001);

    const res2 = await makeRequest(app);
    expect(res2.status).toBe(200);
  });

  it("should fall back to x-forwarded-for when cf-connecting-ip is absent", async () => {
    const app = createTestApp("test-xff", 1, 60_000);

    const res1 = await app.request("/test", {
      method: "POST",
      headers: { "x-forwarded-for": "5.6.7.8, 10.0.0.1" },
    });
    expect(res1.status).toBe(200);

    const res2 = await app.request("/test", {
      method: "POST",
      headers: { "x-forwarded-for": "5.6.7.8, 10.0.0.1" },
    });
    expect(res2.status).toBe(429);
  });

  it("should use separate stores for different store keys", async () => {
    const app = new Hono<Env>();
    app.use("/login", createRateLimiter("login", { windowMs: 60_000, maxRequests: 1 }));
    app.post("/login", (c) => c.json({ ok: true }));
    app.use("/register", createRateLimiter("register", { windowMs: 60_000, maxRequests: 1 }));
    app.post("/register", (c) => c.json({ ok: true }));

    const loginRes = await app.request("/login", {
      method: "POST",
      headers: { "cf-connecting-ip": "1.1.1.1" },
    });
    expect(loginRes.status).toBe(200);

    const registerRes = await app.request("/register", {
      method: "POST",
      headers: { "cf-connecting-ip": "1.1.1.1" },
    });
    expect(registerRes.status).toBe(200);
  });

  it("should throw on invalid options", () => {
    expect(() => createRateLimiter("bad-window", { windowMs: 0, maxRequests: 5 })).toThrow(
      "windowMs and maxRequests must be positive",
    );
    expect(() => createRateLimiter("bad-max", { windowMs: 1000, maxRequests: -1 })).toThrow(
      "windowMs and maxRequests must be positive",
    );
  });

  it("should use custom onLimitExceeded handler when provided", async () => {
    const app = new Hono<Env>();
    app.use(
      "/test",
      createRateLimiter("test-custom-handler", {
        windowMs: 60_000,
        maxRequests: 1,
        onLimitExceeded: (c) => c.html("<h1>Rate limited</h1>", 429),
      }),
    );
    app.post("/test", (c) => c.json({ ok: true }));

    const res1 = await app.request("/test", {
      method: "POST",
      headers: { "cf-connecting-ip": "1.2.3.4" },
    });
    expect(res1.status).toBe(200);

    const res2 = await app.request("/test", {
      method: "POST",
      headers: { "cf-connecting-ip": "1.2.3.4" },
    });
    expect(res2.status).toBe(429);
    const body = await res2.text();
    expect(body).toContain("Rate limited");
  });

  it("should clean up stale entries after the window passes", async () => {
    vi.useFakeTimers();
    const app = createTestApp("test-cleanup", 1, 1000);

    await makeRequest(app, "10.0.0.1");
    await makeRequest(app, "10.0.0.2");
    await makeRequest(app, "10.0.0.3");

    const blockedRes = await makeRequest(app, "10.0.0.1");
    expect(blockedRes.status).toBe(429);

    await vi.advanceTimersByTimeAsync(1001);

    const afterWindowRes = await makeRequest(app, "10.0.0.1");
    expect(afterWindowRes.status).toBe(200);
  });
});
