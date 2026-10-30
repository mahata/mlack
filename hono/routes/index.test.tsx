import { describe, expect, it, vi } from "vitest";
import { createTestApp } from "../testApp.js";

const authenticatedUser = { email: "test@example.com", name: "Test User" };

async function generalMemberEmails(db: D1Database) {
  const { results } = await db
    .prepare("SELECT user_email AS email FROM channel_members WHERE channel_id = 1")
    .all<{ email: string }>();
  return results.map((row) => row.email);
}

describe("Root page", () => {
  it("should render the chat page for an authenticated user", async () => {
    const { app } = createTestApp({ authenticatedUser });

    const response = await app.request("/");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=UTF-8");
    const html = await response.text();
    expect(html).toContain("<title>Mlack</title>");
    expect(html).toContain('src="/static/ChatPage.js"');
    expect(html).toContain("test@example.com");
  });

  it("should auto-join #general once without writing on later visits", async () => {
    const { app, db } = createTestApp({ authenticatedUser });

    await app.request("/");
    await app.request("/");

    expect(await generalMemberEmails(db)).toEqual(["test@example.com"]);
    expect(await db.prepare("SELECT seq FROM sqlite_sequence WHERE name = 'channel_members'").first()).toEqual({
      seq: 1,
    });
  });

  it("should still render the chat page when auto-joining #general fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const failingDb = {
      prepare: () => {
        throw new Error("database unavailable");
      },
    } as unknown as D1Database;
    const { app } = createTestApp({ authenticatedUser, env: { DB: failingDb } });

    const response = await app.request("/");

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('src="/static/ChatPage.js"');
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it("should redirect to login page when user is not logged in", async () => {
    const { app } = createTestApp();

    const response = await app.request("/");

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/auth/login");
  });

  it("should return the About page without authentication", async () => {
    const { app } = createTestApp();

    const response = await app.request("/about");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=UTF-8");
    const html = await response.text();
    expect(html).toContain("<title>About - Mlack</title>");
    expect(html).toContain("About Mlack");
  });

  it("should return 404 for removed workspace URLs", async () => {
    const { app } = createTestApp({ authenticatedUser });

    for (const path of ["/w/default", "/w/default/api/channels", "/w/default/invite/some-code"]) {
      const response = await app.request(path);
      expect(response.status).toBe(404);
    }
  });
});
