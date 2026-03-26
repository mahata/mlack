import type { Context } from "hono";
import type { UpgradeWebSocket, WSContext } from "hono/ws";
import { describe, expect, it, vi } from "vitest";
import { createWsRoute } from "./ws.js";

vi.mock("../db/index.js", () => ({
  getDb: () => ({
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({}),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    }),
  }),
  messages: {},
  channelMembers: { channelId: "channel_id" },
}));

describe("WebSocket endpoint", () => {
  it("should create WebSocket route with proper handlers", () => {
    const mockUpgradeWebSocket = vi.fn((handler) => {
      const mockContext = {
        get: vi.fn((key: string) => {
          if (key === "session") {
            return {
              get: vi.fn().mockReturnValue({ email: "test@example.com", name: "Test User" }),
            };
          }
          return undefined;
        }),
        env: { DB: {} },
      } as unknown as Context;

      return () => handler(mockContext);
    }) as unknown as UpgradeWebSocket;

    const clients = new Map<WSContext, { userEmail: string }>();

    const wsRoute = createWsRoute(mockUpgradeWebSocket, clients);

    expect(wsRoute).toBeDefined();
    expect(typeof wsRoute.request).toBe("function");
  });

  it("should provide WebSocket endpoint route", async () => {
    const mockUpgradeWebSocket = vi.fn(() => {
      return (_c: Context) => {
        return new Response("Upgrade Required", { status: 426 });
      };
    }) as unknown as UpgradeWebSocket;

    const clients = new Map<WSContext, { userEmail: string }>();
    const wsRoute = createWsRoute(mockUpgradeWebSocket, clients);

    const response = await wsRoute.request("/ws");
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
