import type { Hono } from "hono";
import type { MockInstance } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp } from "../testApp.js";
import type { Bindings, Variables } from "../types.js";

const mockSelect = vi.fn();
const mockInsert = vi.fn();

vi.mock("../db/index.js", () => ({
  getDb: () => ({
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  }),
  channels: { id: "id", name: "name", workspaceId: "workspace_id" },
  channelMembers: { channelId: "channel_id", userEmail: "user_email" },
  workspaces: { id: "id", slug: "slug" },
  workspaceMembers: { workspaceId: "workspace_id", userEmail: "user_email" },
}));

const mockWorkspace = { id: 1, name: "Default", slug: "default", createdByEmail: "system", createdAt: "2025-01-01" };
const mockWorkspaceMember = {
  id: 1,
  workspaceId: 1,
  userEmail: "test@example.com",
  role: "member",
  joinedAt: "2025-01-01",
};

describe("Root page", () => {
  let testApp: Hono<{ Bindings: Bindings; Variables: Variables }>;
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSelect.mockReset();
    mockInsert.mockReset();

    const { app } = createTestApp({
      authenticatedUser: {
        email: "test@example.com",
        name: "Test User",
        picture: "https://via.placeholder.com/32",
      },
    });
    testApp = app;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should redirect to workspace when user has exactly one workspace", async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ workspaceId: 1, role: "member" }]),
      }),
    });
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockWorkspace]),
      }),
    });

    const response = await testApp.request("/");

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/w/default");
  });

  it("should redirect to login page when user is not logged in", async () => {
    const { app: testAppNoAuth } = createTestApp({ authenticatedUser: null });

    const response = await testAppNoAuth.request("/");

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/auth/login");
  });

  it("should return the About page without authentication", async () => {
    const { app: testAppNoAuth } = createTestApp({ authenticatedUser: null });

    const response = await testAppNoAuth.request("/about");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=UTF-8");

    const html = await response.text();
    expect(html).toContain("<title>About - Mlack</title>");
    expect(html).toContain("About Mlack");
  });
});

describe("Workspace chat page", () => {
  let testApp: Hono<{ Bindings: Bindings; Variables: Variables }>;
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSelect.mockReset();
    mockInsert.mockReset();

    const { app } = createTestApp({
      authenticatedUser: {
        email: "test@example.com",
        name: "Test User",
        picture: "https://via.placeholder.com/32",
      },
    });
    testApp = app;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  function setupWorkspaceMocks() {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockWorkspace]),
      }),
    });
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([mockWorkspaceMember]),
      }),
    });
  }

  it("should return HTML chat page for workspace member", async () => {
    setupWorkspaceMocks();

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 1, name: "general", workspaceId: 1 }]),
      }),
    });
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ channelId: 1, userEmail: "test@example.com" }]),
      }),
    });

    const response = await testApp.request("/w/default");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=UTF-8");

    const html = await response.text();
    expect(html).toContain('data-workspace-slug="default"');
    expect(html).toContain('src="/static/ChatPage.js"');
    expect(html).toContain("test@example.com");
  });

  it("should include workspace-scoped WebSocket URL", async () => {
    setupWorkspaceMocks();

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const response = await testApp.request("http://localhost:3000/w/default");
    const html = await response.text();

    expect(html).toContain('data-ws-url="ws://localhost:3000/w/default/ws"');
  });

  it("should return 401 for unauthenticated user", async () => {
    const { app: testAppNoAuth } = createTestApp({ authenticatedUser: null });

    const response = await testAppNoAuth.request("/w/default");

    expect(response.status).toBe(401);
  });

  it("should return 404 for non-existent workspace", async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const response = await testApp.request("/w/nonexistent");

    expect(response.status).toBe(404);
  });
});
