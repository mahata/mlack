import type { MiddlewareHandler } from "hono/types";
import type { Session } from "hono-sessions";
import { vi } from "vitest";
import { createApp } from "./app.js";
import type { Env } from "./types.js";

export function createTestApp(options?: {
  authenticatedUser?: { email: string; name: string; picture: string } | null;
  storageMock?: R2Bucket;
}) {
  const testSessionMiddleware: MiddlewareHandler<Env> = async (c, next) => {
    const mockSession = {
      get: vi.fn().mockReturnValue(options?.authenticatedUser || null),
      set: vi.fn(),
      deleteSession: vi.fn(),
    } as unknown as Session;
    c.set("session", mockSession);
    if (!c.env) {
      // biome-ignore lint/suspicious/noExplicitAny: test mock for Workers bindings
      (c as any).env = {};
    }
    if (!c.env.DB) {
      c.env.DB = {} as D1Database;
    }
    if (!c.env.CHAT_ROOM) {
      c.env.CHAT_ROOM = {} as DurableObjectNamespace;
    }
    if (options?.storageMock) {
      c.env.STORAGE = options.storageMock;
    } else if (!c.env.STORAGE) {
      c.env.STORAGE = {} as R2Bucket;
    }
    if (!c.env.NODE_ENV) {
      c.env.NODE_ENV = "test";
    }
    if (!c.env.SESSION_SECRET) {
      c.env.SESSION_SECRET = "test-secret";
    }
    if (!c.env.RESEND_API_KEY) {
      c.env.RESEND_API_KEY = "re_test_key";
    }
    if (!c.env.RESEND_FROM_EMAIL) {
      c.env.RESEND_FROM_EMAIL = "noreply@test.com";
    }
    if (!c.env.SITE_ADMIN_EMAIL) {
      c.env.SITE_ADMIN_EMAIL = "";
    }
    await next();
  };

  return createApp({
    sessionMiddleware: testSessionMiddleware,
  });
}
