import { describe, expect, it } from "vitest";

describe("Deployment compatibility", () => {
  it("should be able to import modules with .js extensions for ES modules", async () => {
    // Test that our main app module can be imported without module resolution errors
    const { app } = await import("./app.js");
    expect(app).toBeDefined();
    expect(typeof app.fetch).toBe("function");
  });

  it("should be able to import all route modules", async () => {
    // Test that all route modules can be imported
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
});