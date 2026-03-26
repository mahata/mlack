import { describe, expect, it, vi } from "vitest";

vi.mock("cloudflare:workers", () => ({
  DurableObject: class DurableObject {
    ctx: unknown;
    env: unknown;
    constructor(ctx: unknown, env: unknown) {
      this.ctx = ctx;
      this.env = env;
    }
  },
}));

describe("Deployment compatibility", () => {
  it("should be able to import modules with .js extensions for ES modules", async () => {
    const { app } = await import("./app.js");
    expect(app).toBeDefined();
    expect(typeof app.fetch).toBe("function");
  });

  it("should be able to import all route modules", async () => {
    const [{ health }, { index }, { createWsRoute }] = await Promise.all([
      import("./routes/health.js"),
      import("./routes/index.js"),
      import("./routes/ws.js"),
    ]);

    expect(health).toBeDefined();
    expect(index).toBeDefined();
    expect(createWsRoute).toBeDefined();
    expect(typeof createWsRoute).toBe("function");
  });

  it("should be able to import ChatPage component", async () => {
    const { ChatPage } = await import("./components/ChatPage.js");
    expect(ChatPage).toBeDefined();
    expect(typeof ChatPage).toBe("function");
  });

  it("should export ChatRoom Durable Object from entry point", async () => {
    const { ChatRoom } = await import("./durableObjects/ChatRoom.js");
    expect(ChatRoom).toBeDefined();
    expect(typeof ChatRoom).toBe("function");
  });
});
