import { describe, expect, it } from "vitest";
import { app } from "./app.tsx";

describe("App integration", () => {
  it("should return 404 for non-existent routes", async () => {
    const response = await app.request("/non-existent");
    expect(response.status).toBe(404);
  });
});
