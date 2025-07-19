import { describe, expect, it, vi } from "vitest";
import { createTestApp } from "../testApp.js";

// Mock the database module
vi.mock("../db/index.js", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                content: "Test message",
                userId: 1,
                userEmail: "test@example.com",
                userName: "Test User",
                createdAt: new Date(),
              },
            ]),
          }),
        }),
      }),
    }),
  },
  messages: {},
  users: {},
}));

describe("Messages API endpoint", () => {
  it("should return messages for authenticated user", async () => {
    const { app } = createTestApp({
      authenticatedUser: { id: 1, email: "test@example.com", name: "Test User", picture: "test.jpg" },
    });

    const response = await app.request("/api/messages");
    expect(response.status).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty("messages");
    expect(Array.isArray(body.messages)).toBe(true);
  });

  it("should return 401 for unauthenticated user", async () => {
    const { app } = createTestApp({
      authenticatedUser: null,
    });

    const response = await app.request("/api/messages");
    expect(response.status).toBe(401);
    
    const body = await response.json();
    expect(body).toHaveProperty("error", "Unauthorized");
  });
});