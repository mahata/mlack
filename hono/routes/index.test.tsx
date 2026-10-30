import type { MockInstance } from "vitest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp } from "../testApp.js";

const mockSelect = vi.fn();
const mockInsert = vi.fn();

vi.mock("../db/index.js", () => ({
  getDb: () => ({
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  }),
  channels: { id: "id", name: "name" },
  channelMembers: { channelId: "channel_id", userEmail: "user_email" },
}));

function mockSelectResult(rows: unknown[]) {
  mockSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(rows),
    }),
  });
}

describe("Root page", () => {
  let testApp: ReturnType<typeof createTestApp>["app"];
  let consoleErrorSpy: MockInstance;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockSelect.mockReset();
    mockInsert.mockReset();

    const { app } = createTestApp({
      authenticatedUser: {
        email: "test@example.com",
        name: "Test User",
      },
    });
    testApp = app;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should render the chat page for an authenticated user", async () => {
    mockSelectResult([{ id: 1, name: "general" }]);
    mockSelectResult([{ channelId: 1, userEmail: "test@example.com" }]);

    const response = await testApp.request("/");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=UTF-8");

    const html = await response.text();
    expect(html).toContain("<title>Mlack</title>");
    expect(html).toContain('src="/static/ChatPage.js"');
    expect(html).toContain("test@example.com");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("should auto-join #general when the user is not a member yet", async () => {
    mockSelectResult([{ id: 1, name: "general" }]);
    mockSelectResult([]);
    const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) });
    mockInsert.mockReturnValueOnce({ values: mockValues });

    const response = await testApp.request("/");

    expect(response.status).toBe(200);
    expect(mockValues).toHaveBeenCalledWith({ channelId: 1, userEmail: "test@example.com" });
  });

  it("should still render the chat page when auto-joining #general fails", async () => {
    mockSelect.mockImplementationOnce(() => {
      throw new Error("database unavailable");
    });

    const response = await testApp.request("/");

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('src="/static/ChatPage.js"');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("should point the chat page at the root WebSocket endpoint", async () => {
    mockSelectResult([]);

    const response = await testApp.request("http://localhost:3000/");
    const html = await response.text();

    expect(html).toContain('data-ws-url="ws://localhost:3000/ws"');
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

  it("should return 404 for removed workspace URLs", async () => {
    for (const path of ["/w/default", "/w/default/api/channels", "/w/default/invite/some-code"]) {
      const response = await testApp.request(path);
      expect(response.status).toBe(404);
    }
    expect(mockSelect).not.toHaveBeenCalled();
  });
});
