import { Hono } from "hono";
import type { UpgradeWebSocket, WSContext, WSMessageReceive } from "hono/ws";
import { WebSocket } from "ws";
import { db, messages } from "../db/index.js";
import type { Variables } from "../types.js";

export function createWsRoute(upgradeWebSocket: UpgradeWebSocket, clients: Set<WSContext>) {
  const ws = new Hono<{ Variables: Variables }>();

  ws.get(
    "/ws",
    upgradeWebSocket((c) => {
      return {
        onOpen: (_evt: Event, ws: WSContext) => {
          console.log("WebSocket client connected");
          clients.add(ws);
        },
        onMessage: async (evt: MessageEvent<WSMessageReceive>) => {
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

          // Get user info from session
          const session = c.get("session");
          const user = session.get("user") as { email?: string; name?: string; picture?: string } | undefined;

          if (user && messageStr.trim()) {
            try {
              // Save message to database
              await db.insert(messages).values({
                content: messageStr,
                userEmail: user.email || "unknown",
                userName: user.name || null,
              });
              console.log("Message saved to database");
            } catch (error) {
              console.error("Error saving message to database:", error);
            }
          }

          // Create formatted message for broadcasting
          const formattedMessage = user ? `${user.name || user.email}: ${messageStr}` : messageStr;

          // Broadcast message to all connected clients
          clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(formattedMessage);
            }
          });
        },
        onClose: (_evt: CloseEvent, ws: WSContext) => {
          console.log("WebSocket client disconnected");
          clients.delete(ws);
        },
        onError: (evt: Event, ws: WSContext) => {
          console.error("WebSocket error:", evt);
          clients.delete(ws);
        },
      };
    }),
  );

  return ws;
}
