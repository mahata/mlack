import { DurableObject } from "cloudflare:workers";
import { and, eq, or } from "drizzle-orm";
import { channelMembers, directConversations, directMessages, getDb, messages } from "../db/index.js";
import type { Bindings } from "../types.js";

type SessionAttachment = {
  userEmail: string;
  userName: string;
};

type IncomingMessage = {
  type: string;
  channelId: number;
  content: string;
  attachmentKey?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: number;
};

type IncomingDm = {
  type: string;
  conversationId: number;
  content: string;
  attachmentKey?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: number;
};

type MembershipEvent = {
  type: string;
  channelId: number;
  userEmail: string;
  userName: string;
};

type IncomingHuddleSignal = {
  type: string;
  conversationId: number;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
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

    let parsed: IncomingMessage | IncomingDm | MembershipEvent | IncomingHuddleSignal;
    try {
      parsed = JSON.parse(rawStr);
    } catch {
      return;
    }

    if (parsed.type === "memberJoin" || parsed.type === "memberLeave") {
      await this.handleMembershipEvent(parsed as MembershipEvent);
      return;
    }

    if (parsed.type === "dm") {
      await this.handleDirectMessage(ws, attachment, parsed as IncomingDm);
      return;
    }

    const huddleTypes = new Set(["huddle-offer", "huddle-answer", "huddle-ice-candidate", "huddle-end"]);
    if (huddleTypes.has(parsed.type)) {
      await this.handleHuddleSignal(ws, attachment, parsed as IncomingHuddleSignal);
      return;
    }

    const msg = parsed as IncomingMessage;
    if (msg.type !== "message" || !msg.channelId) {
      return;
    }

    const hasContent = Boolean(msg.content?.trim());
    const hasAttachment = Boolean(msg.attachmentKey);
    if (!hasContent && !hasAttachment) {
      return;
    }

    const channelId = msg.channelId;
    const trimmedMessage = msg.content?.trim() || "";

    const db = getDb(this.env.DB);

    const membership = await db
      .select()
      .from(channelMembers)
      .where(and(eq(channelMembers.channelId, channelId), eq(channelMembers.userEmail, attachment.userEmail)));

    if (membership.length === 0) {
      try {
        ws.send(JSON.stringify({ type: "error", error: "Not a member of this channel" }));
      } catch {
        // Socket may be closed
      }
      return;
    }

    try {
      await db.insert(messages).values({
        content: trimmedMessage,
        userEmail: attachment.userEmail,
        userName: attachment.userName,
        channelId,
        attachmentKey: msg.attachmentKey || null,
        attachmentName: msg.attachmentName || null,
        attachmentType: msg.attachmentType || null,
        attachmentSize: msg.attachmentSize || null,
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
      attachmentKey: msg.attachmentKey || null,
      attachmentName: msg.attachmentName || null,
      attachmentType: msg.attachmentType || null,
      attachmentSize: msg.attachmentSize || null,
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

  private async handleDirectMessage(ws: WebSocket, sender: SessionAttachment, dm: IncomingDm): Promise<void> {
    if (!dm.conversationId) {
      return;
    }

    const hasContent = Boolean(dm.content?.trim());
    const hasAttachment = Boolean(dm.attachmentKey);
    if (!hasContent && !hasAttachment) {
      return;
    }

    const trimmedContent = dm.content?.trim() || "";
    const db = getDb(this.env.DB);

    const conversation = await db
      .select()
      .from(directConversations)
      .where(
        and(
          eq(directConversations.id, dm.conversationId),
          or(
            eq(directConversations.user1Email, sender.userEmail),
            eq(directConversations.user2Email, sender.userEmail),
          ),
        ),
      );

    if (conversation.length === 0) {
      try {
        ws.send(JSON.stringify({ type: "error", error: "Not a participant in this conversation" }));
      } catch {
        // Socket may be closed
      }
      return;
    }

    const conv = conversation[0];

    try {
      await db.insert(directMessages).values({
        content: trimmedContent,
        userEmail: sender.userEmail,
        userName: sender.userName,
        conversationId: dm.conversationId,
        attachmentKey: dm.attachmentKey || null,
        attachmentName: dm.attachmentName || null,
        attachmentType: dm.attachmentType || null,
        attachmentSize: dm.attachmentSize || null,
      });
    } catch (error) {
      console.error("Error saving DM to database:", error);
    }

    const outgoing = JSON.stringify({
      type: "dm",
      conversationId: dm.conversationId,
      content: trimmedContent,
      userName: sender.userName,
      userEmail: sender.userEmail,
      attachmentKey: dm.attachmentKey || null,
      attachmentName: dm.attachmentName || null,
      attachmentType: dm.attachmentType || null,
      attachmentSize: dm.attachmentSize || null,
    });

    try {
      const participantEmails = new Set([conv.user1Email, conv.user2Email]);
      const allSockets = this.ctx.getWebSockets();

      for (const socket of allSockets) {
        const socketAttachment = socket.deserializeAttachment() as SessionAttachment | null;
        if (socketAttachment && participantEmails.has(socketAttachment.userEmail)) {
          try {
            socket.send(outgoing);
          } catch {
            // Socket may have been closed between iteration and send
          }
        }
      }
    } catch (error) {
      console.error("Error broadcasting DM:", error);
    }
  }

  private async handleHuddleSignal(
    ws: WebSocket,
    sender: SessionAttachment,
    signal: IncomingHuddleSignal,
  ): Promise<void> {
    if (!signal.conversationId) {
      return;
    }

    if (signal.type === "huddle-offer" && !signal.offer) return;
    if (signal.type === "huddle-answer" && !signal.answer) return;
    if (signal.type === "huddle-ice-candidate" && !signal.candidate) return;

    const db = getDb(this.env.DB);

    const conversation = await db
      .select()
      .from(directConversations)
      .where(
        and(
          eq(directConversations.id, signal.conversationId),
          or(
            eq(directConversations.user1Email, sender.userEmail),
            eq(directConversations.user2Email, sender.userEmail),
          ),
        ),
      );

    if (conversation.length === 0) {
      try {
        ws.send(JSON.stringify({ type: "error", error: "Not a participant in this conversation" }));
      } catch {
        // Socket may be closed
      }
      return;
    }

    const conv = conversation[0];
    const otherEmail = conv.user1Email === sender.userEmail ? conv.user2Email : conv.user1Email;

    const outgoing = JSON.stringify({
      ...signal,
      userEmail: sender.userEmail,
      userName: sender.userName,
    });

    try {
      const allSockets = this.ctx.getWebSockets();
      for (const socket of allSockets) {
        const socketAttachment = socket.deserializeAttachment() as SessionAttachment | null;
        if (socketAttachment && socketAttachment.userEmail === otherEmail) {
          try {
            socket.send(outgoing);
          } catch {
            // Socket may have been closed
          }
        }
      }
    } catch (error) {
      console.error("Error relaying huddle signal:", error);
    }
  }

  private async handleMembershipEvent(event: MembershipEvent): Promise<void> {
    const outgoing = JSON.stringify({
      type: event.type,
      channelId: event.channelId,
      userEmail: event.userEmail,
      userName: event.userName,
    });

    try {
      const db = getDb(this.env.DB);
      const members = await db.select().from(channelMembers).where(eq(channelMembers.channelId, event.channelId));
      const memberEmails = new Set(members.map((m) => m.userEmail));

      if (event.type === "memberJoin") {
        memberEmails.add(event.userEmail);
      }

      const allSockets = this.ctx.getWebSockets();
      for (const socket of allSockets) {
        const socketAttachment = socket.deserializeAttachment() as SessionAttachment | null;
        if (socketAttachment && memberEmails.has(socketAttachment.userEmail)) {
          try {
            socket.send(outgoing);
          } catch {
            // Socket may be closed
          }
        }
      }
    } catch (error) {
      console.error("Error broadcasting membership event:", error);
    }
  }

  async webSocketClose(_ws: WebSocket, _code: number, _reason: string, _wasClean: boolean): Promise<void> {
    // No action needed — the runtime has already closed the WebSocket.
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
