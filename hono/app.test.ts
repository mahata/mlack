import { describe, expect, it } from "vitest";

describe("App integration", () => {
  it("should return 404 for non-existent routes", { timeout: 15000 }, async () => {
    const { createTestApp } = await import("./testApp.js");
    const { app } = createTestApp();
    const response = await app.request("/non-existent");

    expect(response.status).toBe(404);
  });

  it("should return 500 when SESSION_SECRET is not set", { timeout: 15000 }, async () => {
    const { createApp } = await import("./app.js");
    const { app } = createApp();

    const request = new Request("http://localhost/health", {
      headers: { Origin: "http://localhost" },
    });

    const response = await app.fetch(request, {
      DB: {} as D1Database,
      CHAT_ROOM: {} as DurableObjectNamespace,
    } as never);
    expect(response.status).toBe(500);
  });
});
