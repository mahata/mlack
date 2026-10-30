import { describe, expect, it } from "vitest";
import { createTestApp } from "../testApp.js";

const authenticatedUser = { email: "test@example.com", name: "Test User" };

describe("Messages API endpoint", () => {
  it("should return the channel's messages oldest first for a member", async () => {
    const { app, db } = createTestApp({ authenticatedUser });
    await db.exec(`
      INSERT INTO channels (id, name, created_by_email) VALUES (2, 'random', 'test@example.com');
      INSERT INTO channel_members (channel_id, user_email) VALUES (1, 'test@example.com');
      INSERT INTO messages (content, user_email, user_name, channel_id, created_at) VALUES
        ('first', 'test@example.com', 'Test User', 1, '2025-01-01 00:00:00'),
        ('second', 'other@example.com', 'Other User', 1, '2025-01-01 00:00:00'),
        ('elsewhere', 'test@example.com', 'Test User', 2, '2025-01-01 00:00:01');
    `);

    const response = await app.request("/api/messages?channelId=1");

    expect(response.status).toBe(200);
    const body = (await response.json()) as { messages: Array<Record<string, unknown>> };
    expect(body.messages.map((message) => message.content)).toEqual(["first", "second"]);
    expect(body.messages[1]).toMatchObject({
      userEmail: "other@example.com",
      userName: "Other User",
      channelId: 1,
      attachmentKey: null,
    });
  });

  it("should return 403 when user is not a member of the channel", async () => {
    const { app } = createTestApp({ authenticatedUser });

    const response = await app.request("/api/messages?channelId=1");

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Not a member of this channel" });
  });

  it("should return 404 when the channel does not exist", async () => {
    const { app } = createTestApp({ authenticatedUser });

    const response = await app.request("/api/messages?channelId=999");

    expect(response.status).toBe(404);
  });

  it("should return 400 when channelId is missing", async () => {
    const { app } = createTestApp({ authenticatedUser });

    const response = await app.request("/api/messages");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "channelId query parameter is required" });
  });

  it("should return 400 when channelId is invalid", async () => {
    const { app } = createTestApp({ authenticatedUser });

    const response = await app.request("/api/messages?channelId=abc");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Invalid channelId" });
  });

  it("should return 401 for unauthenticated user", async () => {
    const { app } = createTestApp();

    const response = await app.request("/api/messages?channelId=1");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  });
});
