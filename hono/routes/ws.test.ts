import { Hono } from "hono";
import type { Session } from "hono-sessions";
import { describe, expect, it, vi } from "vitest";
import type { Bindings, User, Variables, Workspace, WorkspaceMember } from "../types.js";
import { createWsRoute } from "./ws.js";

const WS_UPGRADE_HEADERS = { Upgrade: "websocket", Connection: "Upgrade" };

const mockWorkspace: Workspace = {
  id: 1,
  name: "Default",
  slug: "default",
  createdByEmail: "system",
  createdAt: "2025-01-01",
};

const mockWorkspaceMember: WorkspaceMember = {
  id: 1,
  workspaceId: 1,
  userEmail: "test@example.com",
  role: "member",
  joinedAt: "2025-01-01",
};

function createWsApp(options?: { user?: User | null }) {
  const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
  const mockGetByName = vi.fn().mockReturnValue({ fetch: mockFetch });
  const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

  app.use("*", async (c, next) => {
    const mockSession = {
      get: vi.fn().mockReturnValue(options?.user ?? null),
      set: vi.fn(),
      deleteSession: vi.fn(),
    } as unknown as Session;
    c.set("session", mockSession);
    if (!c.env) {
      // biome-ignore lint/suspicious/noExplicitAny: test mock for Workers bindings
      (c as any).env = {};
    }
    c.env.CHAT_ROOM = { getByName: mockGetByName } as unknown as DurableObjectNamespace;
    c.set("workspace", mockWorkspace);
    c.set("workspaceMember", mockWorkspaceMember);
    await next();
  });

  app.route("/", createWsRoute());
  return { app, mockGetByName, mockFetch };
}

describe("WebSocket endpoint", () => {
  it("should create WebSocket route", () => {
    const wsRoute = createWsRoute();

    expect(wsRoute).toBeDefined();
    expect(typeof wsRoute.request).toBe("function");
  });

  it("should return 426 for non-WebSocket requests", async () => {
    const { app } = createWsApp();

    const response = await app.request("/w/default/ws");
    expect(response.status).toBe(426);
  });

  it("should return 401 for unauthenticated WebSocket upgrade requests", async () => {
    const { app } = createWsApp({ user: null });

    const response = await app.request("/w/default/ws", { headers: WS_UPGRADE_HEADERS });
    expect(response.status).toBe(401);
  });

  it("should forward authenticated WebSocket upgrades to CHAT_ROOM with workspace slug", async () => {
    const user: User = { email: "test@example.com", name: "Test User", picture: "pic.jpg" };
    const { app, mockGetByName, mockFetch } = createWsApp({ user });

    const response = await app.request("/w/default/ws", { headers: WS_UPGRADE_HEADERS });

    expect(response.status).toBe(200);
    expect(mockGetByName).toHaveBeenCalledWith("default");
    const forwardedRequest = mockFetch.mock.calls[0][0] as Request;
    const forwardedUrl = new URL(forwardedRequest.url);
    expect(forwardedUrl.searchParams.get("userEmail")).toBe("test@example.com");
    expect(forwardedUrl.searchParams.get("userName")).toBe("Test User");
  });
});
