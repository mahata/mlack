import { readFile } from "node:fs/promises";
import { join } from "node:path";
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

// Register route handlers
app.get("/static/:filename", async (c) => {
  const filename = c.req.param("filename");
  try {
    const filePath = join(process.cwd(), "dist", "static", filename);
    const content = await readFile(filePath, "utf-8");

    // Set appropriate content type
    if (filename.endsWith(".js")) {
      return c.body(content, 200, {
        "Content-Type": "application/javascript; charset=utf-8",
      });
    }

    return c.text(content);
  } catch (_error) {
    return c.notFound();
  }
});

app.route("/", health);
app.route("/", index);
app.route("/", createWsRoute(upgradeWebSocket, clients));

export { app, injectWebSocket };
