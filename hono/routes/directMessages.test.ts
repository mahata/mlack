import { describe, expect, it, vi } from "vitest";
import { createTestApp } from "../testApp.js";

const mockSelect = vi.fn();
const mockInsert = vi.fn();

vi.mock("../db/index.js", () => ({
  getDb: () => ({
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  }),
  directConversations: {
    id: "id",
    user1Email: "user1_email",
    user2Email: "user2_email",
  },
  directMessages: {
    conversationId: "conversation_id",
    createdAt: "created_at",
  },
  users: { email: "email", name: "name" },
}));

const authenticatedUser = { email: "alice@example.com", name: "Alice", picture: "alice.jpg" };

describe("DM Conversations API", () => {
  describe("GET /api/dm/conversations", () => {
    it("should return empty conversations for a new user", async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/dm/conversations");
      expect(response.status).toBe(200);

      const body = (await response.json()) as { conversations: unknown[] };
      expect(body.conversations).toEqual([]);
    });

    it("should return conversations with other user names", async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 1,
              user1Email: "alice@example.com",
              user2Email: "bob@example.com",
              createdAt: "2025-01-01",
            },
          ]),
        }),
      });

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ email: "bob@example.com", name: "Bob" }]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/dm/conversations");
      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        conversations: { id: number; otherUserEmail: string; otherUserName: string }[];
      };
      expect(body.conversations).toHaveLength(1);
      expect(body.conversations[0].otherUserEmail).toBe("bob@example.com");
      expect(body.conversations[0].otherUserName).toBe("Bob");
    });

    it("should return 401 for unauthenticated user", async () => {
      const { app } = createTestApp({ authenticatedUser: null });
      const response = await app.request("/api/dm/conversations");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/dm/conversations", () => {
    it("should return 400 when targetEmail is missing", async () => {
      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/dm/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(400);

      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("targetEmail is required");
    });

    it("should return 400 when trying to DM yourself", async () => {
      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/dm/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: "alice@example.com" }),
      });
      expect(response.status).toBe(400);

      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("Cannot start a DM with yourself");
    });

    it("should return 404 when target user does not exist", async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/dm/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: "stranger@example.com" }),
      });
      expect(response.status).toBe(404);

      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("User not found");
    });

    it("should return existing conversation if one already exists", async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ name: "Bob" }]),
        }),
      });

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 10,
              user1Email: "alice@example.com",
              user2Email: "bob@example.com",
              createdAt: "2025-01-01",
            },
          ]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/dm/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: "bob@example.com" }),
      });
      expect(response.status).toBe(200);

      const body = (await response.json()) as {
        conversation: { id: number; otherUserEmail: string; otherUserName: string };
      };
      expect(body.conversation.id).toBe(10);
      expect(body.conversation.otherUserEmail).toBe("bob@example.com");
      expect(body.conversation.otherUserName).toBe("Bob");
    });

    it("should create a new conversation when none exists", async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ name: "Bob" }]),
        }),
      });

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 20,
              user1Email: "alice@example.com",
              user2Email: "bob@example.com",
              createdAt: "2025-01-01",
            },
          ]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/dm/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: "bob@example.com" }),
      });
      expect(response.status).toBe(201);

      const body = (await response.json()) as {
        conversation: { id: number; otherUserEmail: string; otherUserName: string };
      };
      expect(body.conversation.id).toBe(20);
      expect(body.conversation.otherUserEmail).toBe("bob@example.com");
      expect(body.conversation.otherUserName).toBe("Bob");
    });
  });

  describe("GET /api/dm/conversations/:id/messages", () => {
    it("should return 400 for invalid conversation ID", async () => {
      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/dm/conversations/abc/messages");
      expect(response.status).toBe(400);

      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("Invalid conversation ID");
    });

    it("should return 404 when conversation does not exist", async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/dm/conversations/999/messages");
      expect(response.status).toBe(404);

      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("Conversation not found");
    });

    it("should return 403 when user is not a participant", async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 1,
              user1Email: "bob@example.com",
              user2Email: "carol@example.com",
              createdAt: "2025-01-01",
            },
          ]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/dm/conversations/1/messages");
      expect(response.status).toBe(403);

      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("Not a participant in this conversation");
    });

    it("should return messages for a valid conversation", async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 1,
              user1Email: "alice@example.com",
              user2Email: "bob@example.com",
              createdAt: "2025-01-01",
            },
          ]),
        }),
      });

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: 1,
                  content: "Hello Bob!",
                  userEmail: "alice@example.com",
                  userName: "Alice",
                  conversationId: 1,
                  createdAt: "2025-01-01T00:00:00.000Z",
                },
              ]),
            }),
          }),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/dm/conversations/1/messages");
      expect(response.status).toBe(200);

      const body = (await response.json()) as { messages: { content: string }[] };
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].content).toBe("Hello Bob!");
    });
  });

  describe("GET /api/dm/members", () => {
    it("should return the other registered users", async () => {
      const otherUsers = [
        { email: "bob@example.com", name: "Bob" },
        { email: "carol@example.com", name: "Carol" },
      ];
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(otherUsers),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/api/dm/members");
      expect(response.status).toBe(200);

      const body = (await response.json()) as { members: { email: string; name: string }[] };
      expect(body.members).toEqual(otherUsers);
    });

    it("should return 401 for unauthenticated user", async () => {
      const { app } = createTestApp({ authenticatedUser: null });
      const response = await app.request("/api/dm/members");
      expect(response.status).toBe(401);
    });
  });
});
