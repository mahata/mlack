import { describe, expect, it, vi } from "vitest";
import { createTestApp } from "../testApp.js";

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();

vi.mock("../db/index.js", () => ({
  getDb: () => ({
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  }),
  channels: { id: "id", name: "name" },
  channelMembers: { channelId: "channel_id", userEmail: "user_email" },
  users: { email: "email", name: "name" },
}));

const authenticatedUser = { email: "test@example.com", name: "Test User", picture: "test.jpg" };
const CSRF_HEADERS = { Origin: "http://localhost" };

describe("Channels API", () => {
  describe("GET /api/channels", () => {
    it("should return channels for authenticated user", async () => {
      const mockChannels = [
        { id: 1, name: "general", createdByEmail: "system", createdAt: "2025-01-01T00:00:00.000Z" },
        { id: 2, name: "random", createdByEmail: "test@example.com", createdAt: "2025-01-01T00:00:00.000Z" },
      ];
      mockSelect.mockReturnValue({
        from: vi.fn().mockResolvedValue(mockChannels),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/channels");

      expect(response.status).toBe(200);
      const body = (await response.json()) as { channels: unknown[] };
      expect(body).toHaveProperty("channels");
      expect(body.channels).toHaveLength(2);
    });

    it("should return 401 for unauthenticated user", async () => {
      const { app } = createTestApp({ authenticatedUser: null });
      const response = await app.request("/api/channels");

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toHaveProperty("error", "Unauthorized");
    });
  });

  describe("GET /api/channels/memberships", () => {
    it("should return myChannels and otherChannels for authenticated user", async () => {
      const mockAllChannels = [
        { id: 1, name: "general", createdByEmail: "system", createdAt: "2025-01-01T00:00:00.000Z" },
        { id: 2, name: "random", createdByEmail: "test@example.com", createdAt: "2025-01-01T00:00:00.000Z" },
      ];
      const mockMemberships = [{ channelId: 1 }];

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockResolvedValue(mockAllChannels),
      });
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockMemberships),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/channels/memberships");

      expect(response.status).toBe(200);
      const body = (await response.json()) as { myChannels: unknown[]; otherChannels: unknown[] };
      expect(body.myChannels).toHaveLength(1);
      expect(body.otherChannels).toHaveLength(1);
    });

    it("should return 401 for unauthenticated user", async () => {
      const { app } = createTestApp({ authenticatedUser: null });
      const response = await app.request("/api/channels/memberships");

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toHaveProperty("error", "Unauthorized");
    });
  });

  describe("GET /api/channels/:id/members", () => {
    it("should return members for a channel the user belongs to", async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 1, name: "general" }]),
        }),
      });
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ userEmail: "test@example.com" }, { userEmail: "other@example.com" }]),
        }),
      });
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { email: "test@example.com", name: "Test User" },
            { email: "other@example.com", name: "Other User" },
          ]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/channels/1/members");

      expect(response.status).toBe(200);
      const body = (await response.json()) as { members: { email: string; name: string }[] };
      expect(body.members).toHaveLength(2);
    });

    it("should return 403 if user is not a member of the channel", async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 2, name: "secret" }]),
        }),
      });
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ userEmail: "other@example.com" }]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/channels/2/members");

      expect(response.status).toBe(403);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("Not a member of this channel");
    });

    it("should return 404 for non-existent channel", async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/channels/999/members");

      expect(response.status).toBe(404);
    });

    it("should return 400 for invalid channel ID", async () => {
      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/channels/abc/members");

      expect(response.status).toBe(400);
    });

    it("should return 401 for unauthenticated user", async () => {
      const { app } = createTestApp({ authenticatedUser: null });
      const response = await app.request("/api/channels/1/members");

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/channels", () => {
    it("should create a channel", async () => {
      const created = {
        id: 3,
        name: "new-channel",
        createdByEmail: "test@example.com",
        createdAt: "2025-01-01T00:00:00.000Z",
      };
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([created]),
        }),
      });
      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockResolvedValue({}),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("http://localhost/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...CSRF_HEADERS },
        body: JSON.stringify({ name: "new-channel" }),
      });

      expect(response.status).toBe(201);
      const body = (await response.json()) as { channel: { name: string } };
      expect(body.channel.name).toBe("new-channel");
    });

    it("should return 400 if name is missing", async () => {
      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("http://localhost/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...CSRF_HEADERS },
        body: JSON.stringify({ name: "" }),
      });

      expect(response.status).toBe(400);
    });

    it("should return 409 if channel name already exists", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 1, name: "general" }]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("http://localhost/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...CSRF_HEADERS },
        body: JSON.stringify({ name: "general" }),
      });

      expect(response.status).toBe(409);
    });

    it("should return 401 for unauthenticated user", async () => {
      const { app } = createTestApp({ authenticatedUser: null });
      const response = await app.request("http://localhost/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...CSRF_HEADERS },
        body: JSON.stringify({ name: "test" }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/channels/:id/join", () => {
    it("should join a channel", async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 2, name: "random" }]),
        }),
      });
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      mockInsert.mockReturnValue({
        values: vi.fn().mockResolvedValue({}),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("http://localhost/api/channels/2/join", {
        method: "POST",
        headers: CSRF_HEADERS,
      });

      expect(response.status).toBe(200);
      const body = (await response.json()) as { message: string };
      expect(body.message).toBe("Joined channel");
    });

    it("should return 200 if already a member", async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 2, name: "random" }]),
        }),
      });
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 1, channelId: 2, userEmail: "test@example.com" }]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("http://localhost/api/channels/2/join", {
        method: "POST",
        headers: CSRF_HEADERS,
      });

      expect(response.status).toBe(200);
      const body = (await response.json()) as { message: string };
      expect(body.message).toBe("Already a member");
    });

    it("should return 404 for non-existent channel", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("http://localhost/api/channels/999/join", {
        method: "POST",
        headers: CSRF_HEADERS,
      });

      expect(response.status).toBe(404);
    });

    it("should return 401 for unauthenticated user", async () => {
      const { app } = createTestApp({ authenticatedUser: null });
      const response = await app.request("http://localhost/api/channels/1/join", {
        method: "POST",
        headers: CSRF_HEADERS,
      });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/channels/:id/leave", () => {
    it("should leave a channel", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 2, name: "random" }]),
        }),
      });
      mockDelete.mockReturnValue({
        where: vi.fn().mockResolvedValue({}),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("http://localhost/api/channels/2/leave", {
        method: "POST",
        headers: CSRF_HEADERS,
      });

      expect(response.status).toBe(200);
      const body = (await response.json()) as { message: string };
      expect(body.message).toBe("Left channel");
    });

    it("should return 403 when leaving #general", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 1, name: "general" }]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("http://localhost/api/channels/1/leave", {
        method: "POST",
        headers: CSRF_HEADERS,
      });

      expect(response.status).toBe(403);
      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("Cannot leave #general");
    });

    it("should return 404 for non-existent channel", async () => {
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("http://localhost/api/channels/999/leave", {
        method: "POST",
        headers: CSRF_HEADERS,
      });

      expect(response.status).toBe(404);
    });

    it("should return 401 for unauthenticated user", async () => {
      const { app } = createTestApp({ authenticatedUser: null });
      const response = await app.request("http://localhost/api/channels/1/leave", {
        method: "POST",
        headers: CSRF_HEADERS,
      });

      expect(response.status).toBe(401);
    });
  });
});
