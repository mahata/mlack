import { describe, expect, it } from "vitest";

describe("App integration", () => {
  it("should return 404 for non-existent routes", { timeout: 15000 }, async () => {
    const { createTestApp } = await import("./testApp.js");
    const { app } = createTestApp();
    const response = await app.request("/non-existent");

    expect(response.status).toBe(404);
  });
});
