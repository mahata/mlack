import { describe, expect, it } from "vitest";
import { createTestApp } from "../testApp.js";

const authenticatedUser = { email: "alice@example.com", name: "Alice" };

const USERS_SQL = `
  INSERT INTO users (email, name, password_hash) VALUES
    ('alice@example.com', 'Alice', 'x'), ('bob@example.com', 'Bob', 'x'), ('carol@example.com', 'Carol', 'x');
`;

function startConversation(app: ReturnType<typeof createTestApp>["app"], targetEmail?: string) {
  return app.request("/api/dm/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: JSON.stringify({ targetEmail }),
  });
}

describe("DM Conversations API", () => {
  describe("GET /api/dm/conversations", () => {
    it("should return empty conversations for a new user", async () => {
      const { app } = createTestApp({ authenticatedUser });

      const response = await app.request("/api/dm/conversations");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ conversations: [] });
    });

    it("should return the user's conversations with the other participant's name", async () => {
      const { app, db } = createTestApp({ authenticatedUser });
      await db.exec(`
        ${USERS_SQL}
        INSERT INTO direct_conversations (id, user1_email, user2_email) VALUES
          (1, 'alice@example.com', 'bob@example.com'),
          (2, 'bob@example.com', 'carol@example.com'),
          (3, 'alice@example.com', 'zed@example.com');
      `);

      const response = await app.request("/api/dm/conversations");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        conversations: [
          { id: 1, otherUserEmail: "bob@example.com", otherUserName: "Bob", createdAt: expect.any(String) },
          {
            id: 3,
            otherUserEmail: "zed@example.com",
            otherUserName: "zed@example.com",
            createdAt: expect.any(String),
          },
        ],
      });
    });

    it("should return 401 for unauthenticated user", async () => {
      const { app } = createTestApp();

      const response = await app.request("/api/dm/conversations");

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/dm/conversations", () => {
    it("should return 400 when targetEmail is missing", async () => {
      const { app } = createTestApp({ authenticatedUser });

      const response = await startConversation(app);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "targetEmail is required" });
    });

    it("should return 400 when trying to DM yourself", async () => {
      const { app } = createTestApp({ authenticatedUser });

      const response = await startConversation(app, "alice@example.com");

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Cannot start a DM with yourself" });
    });

    it("should return 404 when target user does not exist", async () => {
      const { app } = createTestApp({ authenticatedUser });

      const response = await startConversation(app, "nobody@example.com");

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "User not found" });
    });

    it("should create a new conversation when none exists", async () => {
      const { app, db } = createTestApp({ authenticatedUser });
      await db.exec(USERS_SQL);

      const response = await startConversation(app, "bob@example.com");

      expect(response.status).toBe(201);
      const body = (await response.json()) as { conversation: Record<string, unknown> };
      expect(body.conversation).toEqual({
        id: expect.any(Number),
        otherUserEmail: "bob@example.com",
        otherUserName: "Bob",
        createdAt: expect.any(String),
      });
      const stored = await db
        .prepare("SELECT user1_email AS user1Email, user2_email AS user2Email FROM direct_conversations WHERE id = ?")
        .bind(body.conversation.id as number)
        .first();
      expect(stored).toEqual({ user1Email: "alice@example.com", user2Email: "bob@example.com" });
    });

    it("should return the existing conversation when one already exists", async () => {
      const { app, db } = createTestApp({ authenticatedUser });
      await db.exec(`
        ${USERS_SQL}
        INSERT INTO direct_conversations (id, user1_email, user2_email) VALUES (10, 'alice@example.com', 'bob@example.com');
      `);

      const response = await startConversation(app, "bob@example.com");

      expect(response.status).toBe(200);
      const body = (await response.json()) as { conversation: Record<string, unknown> };
      expect(body.conversation).toMatchObject({ id: 10, otherUserEmail: "bob@example.com", otherUserName: "Bob" });
    });
  });

  describe("GET /api/dm/conversations/:id/messages", () => {
    it("should return 400 for invalid conversation ID", async () => {
      const { app } = createTestApp({ authenticatedUser });

      const response = await app.request("/api/dm/conversations/abc/messages");

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Invalid conversation ID" });
    });

    it("should return 404 when conversation does not exist", async () => {
      const { app } = createTestApp({ authenticatedUser });

      const response = await app.request("/api/dm/conversations/999/messages");

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Conversation not found" });
    });

    it("should return 403 when user is not a participant", async () => {
      const { app, db } = createTestApp({ authenticatedUser });
      await db.exec(
        "INSERT INTO direct_conversations (id, user1_email, user2_email) VALUES (1, 'bob@example.com', 'carol@example.com')",
      );

      const response = await app.request("/api/dm/conversations/1/messages");

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Not a participant in this conversation" });
    });

    it("should return the conversation's messages oldest first", async () => {
      const { app, db } = createTestApp({ authenticatedUser });
      await db.exec(`
        INSERT INTO direct_conversations (id, user1_email, user2_email) VALUES (1, 'alice@example.com', 'bob@example.com');
        INSERT INTO direct_messages (content, user_email, user_name, conversation_id) VALUES
          ('Hello Bob!', 'alice@example.com', 'Alice', 1), ('Hi Alice!', 'bob@example.com', 'Bob', 1);
      `);

      const response = await app.request("/api/dm/conversations/1/messages");

      expect(response.status).toBe(200);
      const body = (await response.json()) as { messages: Array<Record<string, unknown>> };
      expect(body.messages.map((message) => message.content)).toEqual(["Hello Bob!", "Hi Alice!"]);
      expect(body.messages[0]).toMatchObject({ userEmail: "alice@example.com", userName: "Alice", conversationId: 1 });
    });
  });

  describe("GET /api/dm/members", () => {
    it("should return the other registered users", async () => {
      const { app, db } = createTestApp({ authenticatedUser });
      await db.exec(USERS_SQL);

      const response = await app.request("/api/dm/members");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        members: [
          { email: "bob@example.com", name: "Bob" },
          { email: "carol@example.com", name: "Carol" },
        ],
      });
    });

    it("should return 401 for unauthenticated user", async () => {
      const { app } = createTestApp();

      const response = await app.request("/api/dm/members");

      expect(response.status).toBe(401);
    });
  });
});
