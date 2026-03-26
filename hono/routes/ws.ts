import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { UpgradeWebSocket, WSContext, WSMessageReceive } from "hono/ws";
import { channelMembers, getDb, messages } from "../db/index.js";
import type { Bindings, User, Variables } from "../types.js";

const WS_OPEN = 1;

type WsClientInfo = { userEmail: string };

export function createWsRoute(upgradeWebSocket: UpgradeWebSocket, clients: Map<WSContext, WsClientInfo>) {
  const ws = new Hono<{ Bindings: Bindings; Variables: Variables }>();

  ws.get(
    "/ws",
    upgradeWebSocket((c) => {
      const session = c.get("session");
      const user = session.get("user") as User | undefined;
      const db = getDb(c.env.DB);

      return {
        onOpen: (_evt: Event, ws: WSContext) => {
          if (!user) {
            ws.close(1008, "Unauthorized");
            return;
          }
          clients.set(ws, { userEmail: user.email });
        },
        onMessage: async (evt: MessageEvent<WSMessageReceive>, ws: WSContext) => {
          if (!user) {
            return;
          }

          if (!clients.has(ws)) {
            clients.set(ws, { userEmail: user.email });
          }

          const raw = evt.data;

          const rawStr =
            typeof raw === "string" ? raw : raw instanceof Blob ? await raw.text() : new TextDecoder().decode(raw);

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
          const trimmedMessage = parsed.content.trim();

          if (!trimmedMessage) {
            return;
          }

          try {
            await db.insert(messages).values({
              content: trimmedMessage,
              userEmail: user.email,
              userName: user.name,
              channelId,
            });
          } catch (error) {
            console.error("Error saving message to database:", error);
          }

          const outgoing = JSON.stringify({
            type: "message",
            channelId,
            content: trimmedMessage,
            userName: user.name,
            userEmail: user.email,
          });

          try {
            const members = await db.select().from(channelMembers).where(eq(channelMembers.channelId, channelId));

            const memberEmails = new Set(members.map((m) => m.userEmail));

            clients.forEach((info, client) => {
              if (client.readyState === WS_OPEN && memberEmails.has(info.userEmail)) {
                client.send(outgoing);
              }
            });
          } catch (error) {
            console.error("Error broadcasting message:", error);
          }
        },
        onClose: (_evt: CloseEvent, ws: WSContext) => {
          clients.delete(ws);
          try {
            ws.close();
          } catch {
            // Ignore errors if the socket is already closed
          }
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
