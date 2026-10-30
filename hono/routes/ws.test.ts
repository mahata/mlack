import { Hono } from "hono";
import { describe, expect, it, vi } from "vitest";
import type { Env, User } from "../types.js";
import { wsRoute } from "./ws.js";

const WS_UPGRADE_HEADERS = { Upgrade: "websocket", Connection: "Upgrade" };

function createWsApp(user: User | null) {
  const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
  const mockGetByName = vi.fn().mockReturnValue({ fetch: mockFetch });
  const app = new Hono<Env>();

  app.use(async (c, next) => {
    if (user) {
      c.set("user", user);
    }
    await next();
  });
  app.route("/", wsRoute);

  const env = { CHAT_ROOM: { getByName: mockGetByName } as unknown as DurableObjectNamespace };
  const request = (headers?: HeadersInit) => app.request("/ws", { headers }, env);
  return { request, mockGetByName, mockFetch };
}

describe("WebSocket endpoint", () => {
  it("should return 426 for non-WebSocket requests", async () => {
    const { request } = createWsApp(null);

    const response = await request();
    expect(response.status).toBe(426);
  });

  it("should return 401 for unauthenticated WebSocket upgrade requests", async () => {
    const { request } = createWsApp(null);

    const response = await request(WS_UPGRADE_HEADERS);
    expect(response.status).toBe(401);
  });

  it("should forward authenticated WebSocket upgrades to the shared CHAT_ROOM", async () => {
    const { request, mockGetByName, mockFetch } = createWsApp({ email: "test@example.com", name: "Test User" });

    const response = await request(WS_UPGRADE_HEADERS);

    expect(response.status).toBe(200);
    expect(mockGetByName).toHaveBeenCalledWith("global");
    const forwardedRequest = mockFetch.mock.calls[0][0] as Request;
    const forwardedUrl = new URL(forwardedRequest.url);
    expect(forwardedUrl.searchParams.get("userEmail")).toBe("test@example.com");
    expect(forwardedUrl.searchParams.get("userName")).toBe("Test User");
  });
});
