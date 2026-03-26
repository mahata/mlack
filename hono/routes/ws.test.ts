import { describe, expect, it } from "vitest";
import { createWsRoute } from "./ws.js";

describe("WebSocket endpoint", () => {
  it("should create WebSocket route", () => {
    const wsRoute = createWsRoute();

    expect(wsRoute).toBeDefined();
    expect(typeof wsRoute.request).toBe("function");
  });

  it("should return 426 for non-WebSocket requests", async () => {
    const wsRoute = createWsRoute();

    const response = await wsRoute.request("/ws");
    expect(response.status).toBe(426);
  });
});
