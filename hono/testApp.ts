import { serveStatic } from "@hono/node-server/serve-static";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import type { WSContext } from "hono/ws";
import type { Session } from "hono-sessions";
import { vi } from "vitest";
import { auth } from "./routes/auth.js";
import { health } from "./routes/health.js";
import { index } from "./routes/index.js";
// import { testAuth } from "./routes/testAuth.js";
import { createWsRoute } from "./routes/ws.js";

type Variables = {
  session: Session;
};

export function createTestApp(options?: {
  authenticatedUser?: { email: string; name: string; picture: string } | null;
}) {
  const app = new Hono<{ Variables: Variables }>();

  // テスト用のセッションミドルウェア
  app.use("*", async (c, next) => {
    const mockSession = {
      get: vi.fn().mockReturnValue(options?.authenticatedUser || null),
      set: vi.fn(),
      deleteSession: vi.fn(),
    } as unknown as Session;
    c.set("session", mockSession);
    await next();
  });

  // Create WebSocket helper
  const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

  // Store connected WebSocket clients
  const clients = new Set<WSContext>();

  // Serve static files from components directory
  app.use("/components/*", serveStatic({ root: "./hono" }));

  // Serve static files from static directory
  app.use("/static/*", serveStatic({ root: "./hono" }));

  // Register route handlers
  app.route("/", health);
  app.route("/", auth);
  // app.route("/", testAuth);
  app.route("/", index);
  app.route("/", createWsRoute(upgradeWebSocket, clients));

  return { app, injectWebSocket };
}
