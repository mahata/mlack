import { serveStatic } from "@hono/node-server/serve-static";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import type { WSContext } from "hono/ws";
import { CookieStore, sessionMiddleware } from "hono-sessions";
import { auth } from "./routes/auth.js";
import { health } from "./routes/health.js";
import { index } from "./routes/index.js";
import { messagesRoute } from "./routes/messages.js";
import { testAuth } from "./routes/testAuth.js";
import { createWsRoute } from "./routes/ws.js";
import type { Variables } from "./types.js";

type AppOptions = {
  sessionMiddleware?: (c: any, next: () => Promise<void>) => Promise<void>;
};

export function createApp(options?: AppOptions) {
  const app = new Hono<{ Variables: Variables }>();

  // Set up session middleware
  if (options?.sessionMiddleware) {
    app.use("*", options.sessionMiddleware);
  } else {
    const store = new CookieStore();
    app.use(
      "*",
      sessionMiddleware({
        store,
        encryptionKey: process.env.SESSION_SECRET || "your-super-secret-key-change-in-production",
        expireAfterSeconds: 3600,
        cookieOptions: {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
          path: "/",
        },
      }),
    );
  }

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
  app.route("/", testAuth);
  app.route("/", messagesRoute);
  app.route("/", index);
  app.route("/", createWsRoute(upgradeWebSocket, clients));

  return { app, injectWebSocket };
}

const { app, injectWebSocket } = createApp();

export { app, injectWebSocket };
