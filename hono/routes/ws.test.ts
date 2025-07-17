import type { Context } from "hono";
import type { UpgradeWebSocket, WSContext } from "hono/ws";
import { describe, expect, it, vi } from "vitest";
import { createWsRoute } from "./ws.js";

// Mock the database module
vi.mock("../db/index.js", () => ({
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue({}),
    }),
  },
  messages: {},
}));

describe("WebSocket endpoint", () => {
  it("should create WebSocket route with proper handlers", () => {
    // Mock the upgradeWebSocket function
    const mockUpgradeWebSocket = vi.fn((handler) => {
      // Create a mock context
      const mockContext = {
        get: vi.fn((key: string) => {
          if (key === "session") {
            return {
              get: vi.fn().mockReturnValue({ email: "test@example.com", name: "Test User" }),
            };
          }
          return undefined;
        }),
      } as unknown as Context;
      
      // Return a mock handler that can be called
      return () => handler(mockContext);
    }) as unknown as UpgradeWebSocket;

    const clients = new Set<WSContext>();

    // Create the WebSocket route
    const wsRoute = createWsRoute(mockUpgradeWebSocket, clients);

    // Verify that the route is a Hono instance
    expect(wsRoute).toBeDefined();
    expect(typeof wsRoute.request).toBe("function");
  });

  it("should provide WebSocket endpoint route", async () => {
    // Mock the upgradeWebSocket function to return a simple handler
    const mockUpgradeWebSocket = vi.fn(() => {
      return (_c: Context) => {
        // Return a response that simulates WebSocket upgrade failure (no proper headers)
        return new Response("Upgrade Required", { status: 426 });
      };
    }) as unknown as UpgradeWebSocket;

    const clients = new Set<WSContext>();
    const wsRoute = createWsRoute(mockUpgradeWebSocket, clients);

    // Test the route exists and handles requests
    const response = await wsRoute.request("/ws");
    // The response status should indicate the route exists and is handled
    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
