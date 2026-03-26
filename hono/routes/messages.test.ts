import { describe, expect, it, vi } from "vitest";
import { createTestApp } from "../testApp.js";

const mockDb = {
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            {
              id: 1,
              content: "Test message",
              userEmail: "test@example.com",
              userName: "Test User",
              channelId: 1,
              createdAt: "2025-01-01T00:00:00.000Z",
            },
          ]),
        }),
      }),
    }),
  }),
};

vi.mock("../db/index.js", () => ({
  getDb: () => mockDb,
  messages: { channelId: "channel_id", createdAt: "created_at" },
}));

describe("Messages API endpoint", () => {
  it("should return messages for authenticated user with channelId", async () => {
    const { app } = createTestApp({
      authenticatedUser: { email: "test@example.com", name: "Test User", picture: "test.jpg" },
    });

    const response = await app.request("/api/messages?channelId=1");
    expect(response.status).toBe(200);

    const body = (await response.json()) as { messages: unknown[] };
    expect(body).toHaveProperty("messages");
    expect(Array.isArray(body.messages)).toBe(true);
  });

  it("should return 400 when channelId is missing", async () => {
    const { app } = createTestApp({
      authenticatedUser: { email: "test@example.com", name: "Test User", picture: "test.jpg" },
    });

    const response = await app.request("/api/messages");
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty("error", "channelId query parameter is required");
  });

  it("should return 400 when channelId is invalid", async () => {
    const { app } = createTestApp({
      authenticatedUser: { email: "test@example.com", name: "Test User", picture: "test.jpg" },
    });

    const response = await app.request("/api/messages?channelId=abc");
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty("error", "Invalid channelId");
  });

  it("should return 401 for unauthenticated user", async () => {
    const { app } = createTestApp({
      authenticatedUser: null,
    });

    const response = await app.request("/api/messages?channelId=1");
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error", "Unauthorized");
  });
});
