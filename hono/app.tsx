import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import type { WSContext } from "hono/ws";
import { WebSocket } from "ws";
import { ChatPage } from "./components/ChatPage";

const app = new Hono();

// Create WebSocket helper
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Store connected WebSocket clients
const clients = new Set<WSContext>();

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    message: "Service is running",
  });
});

// Root page with chat interface
app.get("/", (c) => {
  return c.html(
    <>
      {"<!DOCTYPE html>"}
      <ChatPage />
    </>,
  );
});

// WebSocket endpoint
app.get(
  "/ws",
  upgradeWebSocket(() => {
    return {
      onOpen: (_evt, ws) => {
        console.log("WebSocket client connected");
        clients.add(ws);
      },
      onMessage: (evt) => {
        const message = evt.data;
        console.log("Received message:", message);

        // Convert message to string if it's not already
        let messageStr: string;
        if (typeof message === "string") {
          messageStr = message;
        } else if (message instanceof ArrayBuffer) {
          messageStr = new TextDecoder().decode(message);
        } else if (message instanceof Uint8Array) {
          messageStr = new TextDecoder().decode(message);
        } else {
          messageStr = String(message);
        }

        // Broadcast message to all connected clients
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
          }
        });
      },
      onClose: (_evt, ws) => {
        console.log("WebSocket client disconnected");
        clients.delete(ws);
      },
      onError: (evt, ws) => {
        console.error("WebSocket error:", evt);
        clients.delete(ws);
      },
    };
  }),
);

export { app, injectWebSocket };
