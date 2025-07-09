import { Hono } from "hono";
import type { WSContext } from "hono/ws";
import { WebSocket } from "ws";

export function createWsRoute(upgradeWebSocket: any, clients: Set<WSContext>) {
  const ws = new Hono();

  ws.get(
    "/ws",
    upgradeWebSocket(() => {
      return {
        onOpen: (_evt: any, ws: WSContext) => {
          console.log("WebSocket client connected");
          clients.add(ws);
        },
        onMessage: (evt: any) => {
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
        onClose: (_evt: any, ws: WSContext) => {
          console.log("WebSocket client disconnected");
          clients.delete(ws);
        },
        onError: (evt: any, ws: WSContext) => {
          console.error("WebSocket error:", evt);
          clients.delete(ws);
        },
      };
    }),
  );

  return ws;
}
