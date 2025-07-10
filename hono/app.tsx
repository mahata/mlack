import { serveStatic } from "@hono/node-server/serve-static";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import type { WSContext } from "hono/ws";
import { health } from "./routes/health.js";
import { index } from "./routes/index.js";
import { createWsRoute } from "./routes/ws.js";

const app = new Hono();

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
app.route("/", index);
app.route("/", createWsRoute(upgradeWebSocket, clients));

export { app, injectWebSocket };
