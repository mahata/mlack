import { DurableObject } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { channelMembers, getDb, messages } from "../db/index.js";
import type { Bindings } from "../types.js";

type SessionAttachment = {
  userEmail: string;
  userName: string;
};

export class ChatRoom extends DurableObject<Bindings> {
  constructor(ctx: DurableObjectState, env: Bindings) {
    super(ctx, env);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair("ping", "pong"));
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const userEmail = url.searchParams.get("userEmail");
    const userName = url.searchParams.get("userName");

    if (!userEmail || !userName) {
      return new Response("Missing user info", { status: 400 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    this.ctx.acceptWebSocket(server);

    const attachment: SessionAttachment = { userEmail, userName };
    server.serializeAttachment(attachment);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    const attachment = ws.deserializeAttachment() as SessionAttachment | null;
    if (!attachment) {
      return;
    }

    const rawStr = typeof message === "string" ? message : new TextDecoder().decode(message);

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

    const db = getDb(this.env.DB);

    try {
      await db.insert(messages).values({
        content: trimmedMessage,
        userEmail: attachment.userEmail,
        userName: attachment.userName,
        channelId,
      });
    } catch (error) {
      console.error("Error saving message to database:", error);
    }

    const outgoing = JSON.stringify({
      type: "message",
      channelId,
      content: trimmedMessage,
      userName: attachment.userName,
      userEmail: attachment.userEmail,
    });

    try {
      const members = await db.select().from(channelMembers).where(eq(channelMembers.channelId, channelId));
      const memberEmails = new Set(members.map((m) => m.userEmail));
      const allSockets = this.ctx.getWebSockets();

      for (const socket of allSockets) {
        const socketAttachment = socket.deserializeAttachment() as SessionAttachment | null;
        if (socketAttachment && memberEmails.has(socketAttachment.userEmail)) {
          try {
            socket.send(outgoing);
          } catch {
            // Socket may have been closed between iteration and send
          }
        }
      }
    } catch (error) {
      console.error("Error broadcasting message:", error);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, _wasClean: boolean): Promise<void> {
    try {
      ws.close(code, reason);
    } catch {
      // Ignore errors if the socket is already closed
    }
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    console.error("WebSocket error in Durable Object");
    try {
      ws.close(1011, "Internal error");
    } catch {
      // Ignore
    }
  }
}
