import { serveStatic } from "@hono/node-server/serve-static";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import type { WSContext } from "hono/ws";
import { sessionMiddleware, CookieStore } from "hono-sessions";
import { health } from "./routes/health.js";
import { index } from "./routes/index.js";
import { createWsRoute } from "./routes/ws.js";
import { auth } from "./routes/auth.js";
import { testAuth } from "./routes/testAuth.js";

const app = new Hono();

// セッション設定
const store = new CookieStore();
app.use(
  "*",
  sessionMiddleware({
    store,
    encryptionKey: process.env.SESSION_SECRET || "your-super-secret-key-change-in-production",
    expireAfterSeconds: 3600, // 1時間に延長
    cookieOptions: {
      httpOnly: true,
      secure: false, // 開発環境ではfalseに設定
      sameSite: "lax",
      path: "/",
    },
  })
);

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
app.route("/", index);
app.route("/", createWsRoute(upgradeWebSocket, clients));

export { app, injectWebSocket };
