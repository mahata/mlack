import { describe, expect, it, vi } from "vitest";
import { createTestApp } from "../testApp.js";

const mockSelect = vi.fn();

vi.mock("../db/index.js", () => ({
  getDb: () => ({
    select: (...args: unknown[]) => mockSelect(...args),
  }),
  messages: { channelId: "channel_id", createdAt: "created_at" },
  channelMembers: { channelId: "channel_id", userEmail: "user_email" },
}));

const authenticatedUser = { email: "test@example.com", name: "Test User", picture: "test.jpg" };

describe("Messages API endpoint", () => {
  it("should return messages for authenticated member with channelId", async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 1, channelId: 1, userEmail: "test@example.com" }]),
      }),
    });
    mockSelect.mockReturnValueOnce({
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
    });

    const { app } = createTestApp({ authenticatedUser });
    const response = await app.request("/api/messages?channelId=1");
    expect(response.status).toBe(200);

    const body = (await response.json()) as { messages: unknown[] };
    expect(body).toHaveProperty("messages");
    expect(Array.isArray(body.messages)).toBe(true);
  });

  it("should return 403 when user is not a member of the channel", async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    const { app } = createTestApp({ authenticatedUser });
    const response = await app.request("/api/messages?channelId=1");
    expect(response.status).toBe(403);

    const body = (await response.json()) as { error: string };
    expect(body.error).toBe("Not a member of this channel");
  });

  it("should return 400 when channelId is missing", async () => {
    const { app } = createTestApp({ authenticatedUser });

    const response = await app.request("/api/messages");
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body).toHaveProperty("error", "channelId query parameter is required");
  });

  it("should return 400 when channelId is invalid", async () => {
    const { app } = createTestApp({ authenticatedUser });

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
