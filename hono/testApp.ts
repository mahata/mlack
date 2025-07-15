import type { Session } from "hono-sessions";
import { vi } from "vitest";
import { createApp } from "./app.js";

export function createTestApp(options?: {
  authenticatedUser?: { email: string; name: string; picture: string } | null;
}) {
  // Create test session middleware
  const testSessionMiddleware = async (c: any, next: () => Promise<void>) => {
    const mockSession = {
      get: vi.fn().mockReturnValue(options?.authenticatedUser || null),
      set: vi.fn(),
      deleteSession: vi.fn(),
    } as unknown as Session;
    c.set("session", mockSession);
    await next();
  };

  // Use createApp function from app.tsx and inject test session middleware
  return createApp({
    sessionMiddleware: testSessionMiddleware,
  });
}
