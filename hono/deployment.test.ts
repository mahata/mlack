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
  it("should be able to import modules with .js extensions for ES modules", { timeout: 15000 }, async () => {
    const { app } = await import("./app.js");
    expect(app).toBeDefined();
    expect(typeof app.fetch).toBe("function");
  });

  it("should be able to import all route modules", async () => {
    const [
      { healthRoute },
      { indexRoute },
      { createWsRoute },
      { workspacesRoute },
      { workspaceAdminRoute },
      { workspaceInviteRoute },
    ] = await Promise.all([
      import("./routes/health.js"),
      import("./routes/index.js"),
      import("./routes/ws.js"),
      import("./routes/workspaces.js"),
      import("./routes/workspaceAdmin.js"),
      import("./routes/workspaceInvite.js"),
    ]);

    expect(healthRoute).toBeDefined();
    expect(indexRoute).toBeDefined();
    expect(createWsRoute).toBeDefined();
    expect(typeof createWsRoute).toBe("function");
    expect(workspacesRoute).toBeDefined();
    expect(workspaceAdminRoute).toBeDefined();
    expect(workspaceInviteRoute).toBeDefined();
  });

  it("should be able to import ChatPage component", async () => {
    const { ChatPage } = await import("./components/ChatPage.js");
    expect(ChatPage).toBeDefined();
    expect(typeof ChatPage).toBe("function");
  });

  it("should be able to import WorkspacesPage component", async () => {
    const { WorkspacesPage } = await import("./components/WorkspacesPage.js");
    expect(WorkspacesPage).toBeDefined();
    expect(typeof WorkspacesPage).toBe("function");
  });

  it("should be able to import InvitePage component", async () => {
    const { InvitePage } = await import("./components/InvitePage.js");
    expect(InvitePage).toBeDefined();
    expect(typeof InvitePage).toBe("function");
  });

  it("should export ChatRoom Durable Object from entry point", async () => {
    const { ChatRoom } = await import("./durableObjects/ChatRoom.js");
    expect(ChatRoom).toBeDefined();
    expect(typeof ChatRoom).toBe("function");
  });
});
