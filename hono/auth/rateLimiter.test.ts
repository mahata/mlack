import { Hono } from "hono";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../types.js";
import { createRateLimiter, MAX_TRACKED_CLIENTS } from "./rateLimiter.js";

function createLimitedApp(maxRequests: number, windowMs = 60_000) {
  const app = new Hono<Env>();
  app.use(createRateLimiter({ windowMs, maxRequests, onLimitExceeded: (c) => c.text("Too many requests", 429) }));
  app.post("/", (c) => c.text("ok"));
  return (ip = "1.2.3.4") => app.request("/", { method: "POST", headers: { "cf-connecting-ip": ip } });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createRateLimiter", () => {
  it("should allow requests up to the limit and reject the rest", async () => {
    const request = createLimitedApp(2);

    expect((await request()).status).toBe(200);
    expect((await request()).status).toBe(200);
    const rejected = await request();

    expect(rejected.status).toBe(429);
    expect(await rejected.text()).toBe("Too many requests");
  });

  it("should count each client IP separately", async () => {
    const request = createLimitedApp(1);

    expect((await request("10.0.0.1")).status).toBe(200);
    expect((await request("10.0.0.2")).status).toBe(200);
    expect((await request("10.0.0.1")).status).toBe(429);
  });

  it("should start a new window once the previous one has passed", async () => {
    vi.useFakeTimers();
    const request = createLimitedApp(1, 1000);

    expect((await request()).status).toBe(200);
    expect((await request()).status).toBe(429);
    await vi.advanceTimersByTimeAsync(1001);

    expect((await request()).status).toBe(200);
  });

  it("should keep separate counts for separate limiters", async () => {
    const limitedRequest = createLimitedApp(1);
    const otherLimitedRequest = createLimitedApp(1);

    expect((await limitedRequest()).status).toBe(200);
    expect((await otherLimitedRequest()).status).toBe(200);
  });

  it("should keep blocking a client when the tracked clients reach capacity", async () => {
    const request = createLimitedApp(1);
    expect((await request("10.0.0.1")).status).toBe(200);
    for (let index = 1; index < MAX_TRACKED_CLIENTS; index++) {
      await request(`10.1.${index >> 8}.${index & 255}`);
    }

    expect((await request("10.0.0.1")).status).toBe(429);
    expect((await request("10.2.0.1")).status).toBe(200);
  });
});
