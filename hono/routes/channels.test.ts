import { describe, expect, it } from "vitest";
import { createTestApp } from "../testApp.js";

const authenticatedUser = { email: "test@example.com", name: "Test User" };

function post(app: ReturnType<typeof createTestApp>["app"], path: string, body?: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function memberEmails(db: D1Database, channelId: number) {
  const { results } = await db
    .prepare("SELECT user_email AS email FROM channel_members WHERE channel_id = ? ORDER BY user_email")
    .bind(channelId)
    .all<{ email: string }>();
  return results.map((row) => row.email);
}

async function createAppWithRandomChannel(options: { joined: boolean }) {
  const testApp = createTestApp({ authenticatedUser });
  await testApp.db.exec(`
    INSERT INTO channels (id, name, created_by_email) VALUES (2, 'random', 'other@example.com');
    INSERT INTO channel_members (channel_id, user_email) VALUES (1, 'test@example.com');
    ${options.joined ? "INSERT INTO channel_members (channel_id, user_email) VALUES (2, 'test@example.com');" : ""}
  `);
  return testApp;
}

describe("Channels API", () => {
  describe("GET /api/channels/memberships", () => {
    it("should split channels into joined and other channels", async () => {
      const { app } = await createAppWithRandomChannel({ joined: false });

      const response = await app.request("/api/channels/memberships");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        myChannels: [{ id: 1, name: "general", createdByEmail: "system", createdAt: expect.any(String) }],
        otherChannels: [{ id: 2, name: "random", createdByEmail: "other@example.com", createdAt: expect.any(String) }],
      });
    });

    it("should return 401 for unauthenticated user", async () => {
      const { app } = createTestApp();

      const response = await app.request("/api/channels/memberships");

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "Unauthorized" });
    });
  });

  describe("GET /api/channels/:id/members", () => {
    it("should return the registered members of a channel the user belongs to", async () => {
      const { app, db } = createTestApp({ authenticatedUser });
      await db.exec(`
        INSERT INTO users (email, name, password_hash) VALUES
          ('test@example.com', 'Test User', 'x'), ('other@example.com', 'Other User', 'x');
        INSERT INTO channel_members (channel_id, user_email) VALUES
          (1, 'test@example.com'), (1, 'other@example.com');
      `);

      const response = await app.request("/api/channels/1/members");

      expect(response.status).toBe(200);
      const body = (await response.json()) as { members: Array<{ email: string; name: string }> };
      expect(body.members).toHaveLength(2);
      expect(body.members).toContainEqual({ email: "other@example.com", name: "Other User" });
    });

    it("should return 403 if user is not a member of the channel", async () => {
      const { app } = await createAppWithRandomChannel({ joined: false });

      const response = await app.request("/api/channels/2/members");

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Not a member of this channel" });
    });

    it("should return 404 for non-existent channel", async () => {
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
      const { app } = createTestApp();

      const response = await app.request("/api/channels/1/members");

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/channels", () => {
    it("should create a channel and make the creator a member", async () => {
      const { app, db } = createTestApp({ authenticatedUser });

      const response = await post(app, "/api/channels", { name: " new-channel " });

      expect(response.status).toBe(201);
      const body = (await response.json()) as { channel: { id: number; name: string; createdByEmail: string } };
      expect(body.channel).toMatchObject({ name: "new-channel", createdByEmail: "test@example.com" });
      expect(await memberEmails(db, body.channel.id)).toEqual(["test@example.com"]);
    });

    it("should return 400 if name is missing", async () => {
      const { app } = createTestApp({ authenticatedUser });

      const response = await post(app, "/api/channels", { name: "" });

      expect(response.status).toBe(400);
    });

    it("should return 409 if channel name already exists", async () => {
      const { app } = createTestApp({ authenticatedUser });

      const response = await post(app, "/api/channels", { name: "general" });

      expect(response.status).toBe(409);
      expect(await response.json()).toEqual({ error: "Channel name already exists" });
    });

    it("should return 401 for unauthenticated user", async () => {
      const { app } = createTestApp();

      const response = await post(app, "/api/channels", { name: "test" });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/channels/:id/join", () => {
    it("should join a channel", async () => {
      const { app, db } = await createAppWithRandomChannel({ joined: false });

      const response = await post(app, "/api/channels/2/join");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ message: "Joined channel" });
      expect(await memberEmails(db, 2)).toEqual(["test@example.com"]);
    });

    it("should return 200 if already a member", async () => {
      const { app } = await createAppWithRandomChannel({ joined: true });

      const response = await post(app, "/api/channels/2/join");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ message: "Already a member" });
    });

    it("should return 404 for non-existent channel", async () => {
      const { app } = createTestApp({ authenticatedUser });

      const response = await post(app, "/api/channels/999/join");

      expect(response.status).toBe(404);
    });

    it("should return 401 for unauthenticated user", async () => {
      const { app } = createTestApp();

      const response = await post(app, "/api/channels/1/join");

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/channels/:id/leave", () => {
    it("should leave a channel", async () => {
      const { app, db } = await createAppWithRandomChannel({ joined: true });

      const response = await post(app, "/api/channels/2/leave");

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ message: "Left channel" });
      expect(await memberEmails(db, 2)).toEqual([]);
    });

    it("should return 403 when leaving #general", async () => {
      const { app } = await createAppWithRandomChannel({ joined: true });

      const response = await post(app, "/api/channels/1/leave");

      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({ error: "Cannot leave #general" });
    });

    it("should return 404 for non-existent channel", async () => {
      const { app } = createTestApp({ authenticatedUser });

      const response = await post(app, "/api/channels/999/leave");

      expect(response.status).toBe(404);
    });

    it("should return 401 for unauthenticated user", async () => {
      const { app } = createTestApp();

      const response = await post(app, "/api/channels/1/leave");

      expect(response.status).toBe(401);
    });
  });
});
