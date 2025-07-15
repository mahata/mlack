import type { Session } from "hono-sessions";
import { vi } from "vitest";
import { createApp } from "./app.js";

export function createTestApp(options?: {
  authenticatedUser?: { email: string; name: string; picture: string } | null;
}) {
  // テスト用のセッションミドルウェアを作成
  const testSessionMiddleware = async (c: any, next: () => Promise<void>) => {
    const mockSession = {
      get: vi.fn().mockReturnValue(options?.authenticatedUser || null),
      set: vi.fn(),
      deleteSession: vi.fn(),
    } as unknown as Session;
    c.set("session", mockSession);
    await next();
  };

  // app.tsx の createApp 関数を使用し、テスト用のセッションミドルウェアを注入
  return createApp({
    sessionMiddleware: testSessionMiddleware,
  });
}
