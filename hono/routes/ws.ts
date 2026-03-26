import { Hono } from "hono";
import type { UpgradeWebSocket, WSContext, WSMessageReceive } from "hono/ws";
import { WebSocket } from "ws";
import { db, messages } from "../db/index.js";
import type { User, Variables } from "../types.js";

export function createWsRoute(upgradeWebSocket: UpgradeWebSocket, clients: Set<WSContext>) {
  const ws = new Hono<{ Variables: Variables }>();

  ws.get(
    "/ws",
    upgradeWebSocket((c) => {
      const session = c.get("session");
      const user = session.get("user") as User | undefined;

      return {
        onOpen: (_evt: Event, ws: WSContext) => {
          if (!user) {
            ws.close(1008, "Unauthorized");
            return;
          }
          clients.add(ws);
        },
        onMessage: async (evt: MessageEvent<WSMessageReceive>) => {
          const message = evt.data;

          const messageStr =
            typeof message === "string"
              ? message
              : message instanceof Blob
                ? await message.text()
                : new TextDecoder().decode(message);
          const trimmedMessage = messageStr.trim();

          if (!user || !trimmedMessage) {
            return;
          }

          try {
            await db.insert(messages).values({
              content: trimmedMessage,
              userEmail: user.email || "unknown",
              userName: user.name || null,
            });
          } catch (error) {
            console.error("Error saving message to database:", error);
          }

          const formattedMessage = `${user.name || user.email}: ${trimmedMessage}`;

          clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(formattedMessage);
            }
          });
        },
        onClose: (_evt: CloseEvent, ws: WSContext) => {
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
