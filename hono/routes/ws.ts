import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { UpgradeWebSocket, WSContext, WSMessageReceive } from "hono/ws";
import { WebSocket } from "ws";
import { channelMembers, db, messages } from "../db/index.js";
import type { User, Variables } from "../types.js";

type WsClientInfo = { userEmail: string };

export function createWsRoute(
  upgradeWebSocket: UpgradeWebSocket,
  clients: Map<WSContext, WsClientInfo>,
) {
  const ws = new Hono<{ Variables: Variables }>();

  ws.get(
    "/ws",
    upgradeWebSocket((c) => {
      const session = c.get("session");
      const user = session.get("user") as User | undefined;

      return {
        onOpen: (_evt: Event, ws: WSContext) => {
          clients.set(ws, { userEmail: user?.email || "unknown" });
        },
        onMessage: async (evt: MessageEvent<WSMessageReceive>) => {
          const raw = evt.data;

          const rawStr =
            typeof raw === "string"
              ? raw
              : raw instanceof Blob
                ? await raw.text()
                : new TextDecoder().decode(raw);

          let parsed: { type: string; channelId: number; content: string };
          try {
            parsed = JSON.parse(rawStr);
          } catch {
            return;
          }

          if (parsed.type !== "message" || !parsed.channelId || !parsed.content?.trim()) {
            return;
          }

          const channelId = parsed.channelId;
          const content = parsed.content.trim();

          if (user && content) {
            try {
              await db.insert(messages).values({
                content,
                userEmail: user.email || "unknown",
                userName: user.name || null,
                channelId,
              });
            } catch (error) {
              console.error("Error saving message to database:", error);
            }
          }

          const outgoing = JSON.stringify({
            type: "message",
            channelId,
            content,
            userName: user?.name || null,
            userEmail: user?.email || "unknown",
          });

          try {
            const members = await db
              .select()
              .from(channelMembers)
              .where(eq(channelMembers.channelId, channelId));

            const memberEmails = new Set(members.map((m) => m.userEmail));

            clients.forEach((info, client) => {
              if (client.readyState === WebSocket.OPEN && memberEmails.has(info.userEmail)) {
                client.send(outgoing);
              }
            });
          } catch (error) {
            console.error("Error broadcasting message:", error);
          }
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
