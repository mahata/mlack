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
    workspaceId: "workspace_id",
    user1Email: "user1_email",
    user2Email: "user2_email",
  },
  directMessages: {
    conversationId: "conversation_id",
    createdAt: "created_at",
  },
  users: { email: "email", name: "name" },
  workspaces: { id: "id", slug: "slug" },
  workspaceMembers: { workspaceId: "workspace_id", userEmail: "user_email" },
}));

const authenticatedUser = { email: "alice@example.com", name: "Alice", picture: "alice.jpg" };

const mockWorkspace = { id: 1, name: "Default", slug: "default", createdByEmail: "system", createdAt: "2025-01-01" };
const mockWorkspaceMember = {
  id: 1,
  workspaceId: 1,
  userEmail: "alice@example.com",
  role: "member",
  joinedAt: "2025-01-01",
};

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

describe("DM Conversations API", () => {
  describe("GET /w/:slug/api/dm/conversations", () => {
    it("should return empty conversations for a new user", async () => {
      setupWorkspaceMocks();

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/w/default/api/dm/conversations");
      expect(response.status).toBe(200);

      const body = (await response.json()) as { conversations: unknown[] };
      expect(body.conversations).toEqual([]);
    });

    it("should return conversations with other user names", async () => {
      setupWorkspaceMocks();

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 1,
              workspaceId: 1,
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
      const response = await app.request("/w/default/api/dm/conversations");
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
      const response = await app.request("/w/default/api/dm/conversations");
      expect(response.status).toBe(401);
    });
  });

  describe("POST /w/:slug/api/dm/conversations", () => {
    it("should return 400 when targetEmail is missing", async () => {
      setupWorkspaceMocks();

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/w/default/api/dm/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      expect(response.status).toBe(400);

      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("targetEmail is required");
    });

    it("should return 400 when trying to DM yourself", async () => {
      setupWorkspaceMocks();

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/w/default/api/dm/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: "alice@example.com" }),
      });
      expect(response.status).toBe(400);

      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("Cannot start a DM with yourself");
    });

    it("should return 404 when target is not a workspace member", async () => {
      setupWorkspaceMocks();

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/w/default/api/dm/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: "stranger@example.com" }),
      });
      expect(response.status).toBe(404);

      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("User is not a member of this workspace");
    });

    it("should return existing conversation if one already exists", async () => {
      setupWorkspaceMocks();

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 1, workspaceId: 1, userEmail: "bob@example.com" }]),
        }),
      });

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 10,
              workspaceId: 1,
              user1Email: "alice@example.com",
              user2Email: "bob@example.com",
              createdAt: "2025-01-01",
            },
          ]),
        }),
      });

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ name: "Bob" }]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/w/default/api/dm/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: "bob@example.com" }),
      });
      expect(response.status).toBe(200);

      const body = (await response.json()) as { conversation: { id: number; otherUserEmail: string } };
      expect(body.conversation.id).toBe(10);
      expect(body.conversation.otherUserEmail).toBe("bob@example.com");
    });

    it("should create a new conversation when none exists", async () => {
      setupWorkspaceMocks();

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 1, workspaceId: 1, userEmail: "bob@example.com" }]),
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
              workspaceId: 1,
              user1Email: "alice@example.com",
              user2Email: "bob@example.com",
              createdAt: "2025-01-01",
            },
          ]),
        }),
      });

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ name: "Bob" }]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/w/default/api/dm/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail: "bob@example.com" }),
      });
      expect(response.status).toBe(201);

      const body = (await response.json()) as { conversation: { id: number; otherUserEmail: string } };
      expect(body.conversation.id).toBe(20);
      expect(body.conversation.otherUserEmail).toBe("bob@example.com");
    });
  });

  describe("GET /w/:slug/api/dm/conversations/:id/messages", () => {
    it("should return 400 for invalid conversation ID", async () => {
      setupWorkspaceMocks();

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/w/default/api/dm/conversations/abc/messages");
      expect(response.status).toBe(400);

      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("Invalid conversation ID");
    });

    it("should return 404 when conversation does not exist", async () => {
      setupWorkspaceMocks();

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/w/default/api/dm/conversations/999/messages");
      expect(response.status).toBe(404);

      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("Conversation not found");
    });

    it("should return 403 when user is not a participant", async () => {
      setupWorkspaceMocks();

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 1,
              workspaceId: 1,
              user1Email: "bob@example.com",
              user2Email: "carol@example.com",
              createdAt: "2025-01-01",
            },
          ]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/w/default/api/dm/conversations/1/messages");
      expect(response.status).toBe(403);

      const body = (await response.json()) as { error: string };
      expect(body.error).toBe("Not a participant in this conversation");
    });

    it("should return messages for a valid conversation", async () => {
      setupWorkspaceMocks();

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            {
              id: 1,
              workspaceId: 1,
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
      const response = await app.request("/w/default/api/dm/conversations/1/messages");
      expect(response.status).toBe(200);

      const body = (await response.json()) as { messages: { content: string }[] };
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].content).toBe("Hello Bob!");
    });
  });

  describe("GET /w/:slug/api/dm/workspace-members", () => {
    it("should return workspace members excluding current user", async () => {
      setupWorkspaceMocks();

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockResolvedValue([
              { userEmail: "alice@example.com" },
              { userEmail: "bob@example.com" },
              { userEmail: "carol@example.com" },
            ]),
        }),
      });

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { email: "bob@example.com", name: "Bob" },
            { email: "carol@example.com", name: "Carol" },
          ]),
        }),
      });

      const { app } = createTestApp({ authenticatedUser });
      const response = await app.request("/w/default/api/dm/workspace-members");
      expect(response.status).toBe(200);

      const body = (await response.json()) as { members: { email: string; name: string }[] };
      expect(body.members).toHaveLength(2);
      expect(body.members.every((m) => m.email !== "alice@example.com")).toBe(true);
    });

    it("should return 401 for unauthenticated user", async () => {
      const { app } = createTestApp({ authenticatedUser: null });
      const response = await app.request("/w/default/api/dm/workspace-members");
      expect(response.status).toBe(401);
    });
  });
});
