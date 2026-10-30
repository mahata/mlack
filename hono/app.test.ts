import { describe, expect, it } from "vitest";
import { app } from "./app.js";
import { createTestApp } from "./testApp.js";

describe("App integration", () => {
  it("should return 404 for non-existent routes", async () => {
    const { app: testApp } = createTestApp();
    const response = await testApp.request("/non-existent");

    expect(response.status).toBe(404);
  });

  it("should return 500 when SESSION_SECRET is not set", async () => {
    const request = new Request("http://localhost/health", {
      headers: { Origin: "http://localhost" },
    });

    const response = await app.fetch(request, {
      DB: {} as D1Database,
      CHAT_ROOM: {} as DurableObjectNamespace,
    });
    expect(response.status).toBe(500);
  });
});
