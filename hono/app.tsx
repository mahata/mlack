import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import type { WSContext } from "hono/ws";
import { health } from "./routes/health";
import { index } from "./routes/index";
import { createWsRoute } from "./routes/ws";

const app = new Hono();

// Create WebSocket helper
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Store connected WebSocket clients
const clients = new Set<WSContext>();

// Register route handlers
app.route("/", health);
app.route("/", index);
app.route("/", createWsRoute(upgradeWebSocket, clients));

export { app, injectWebSocket };
