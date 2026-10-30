import { DurableObject } from "cloudflare:workers";
import { getConversationForParticipant, isChannelMember } from "../db/queries.js";
import type { Bindings } from "../types.js";

type SocketUser = {
  userEmail: string;
  userName: string;
};

type IncomingEvent = {
  type?: string;
  channelId?: number;
  conversationId?: number;
  content?: string;
  attachmentKey?: string;
  attachmentName?: string;
  attachmentType?: string;
  attachmentSize?: number;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

const HUDDLE_SIGNAL_REQUIRED_FIELDS = new Map<string, "offer" | "answer" | "candidate" | null>([
  ["huddle-offer", "offer"],
  ["huddle-answer", "answer"],
  ["huddle-ice-candidate", "candidate"],
  ["huddle-end", null],
]);

const MAX_MESSAGE_LENGTH = 4096;
const MAX_WEBSOCKET_PAYLOAD_BYTES = 65536;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function insertMessageSql(table: string, targetColumn: string): string {
  return `INSERT INTO ${table} (content, user_email, user_name, ${targetColumn}, attachment_key, attachment_name, attachment_type, attachment_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
}

const INSERT_CHANNEL_MESSAGE_SQL = insertMessageSql("messages", "channel_id");
const INSERT_DIRECT_MESSAGE_SQL = insertMessageSql("direct_messages", "conversation_id");

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

    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ userEmail, userName } satisfies SocketUser);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string): Promise<void> {
    const sender = ws.deserializeAttachment() as SocketUser | null;
    if (!sender) {
      return;
    }

    const payloadBytes = typeof message === "string" ? textEncoder.encode(message).byteLength : message.byteLength;
    if (payloadBytes > MAX_WEBSOCKET_PAYLOAD_BYTES) {
      this.sendError(ws, "Message payload too large");
      return;
    }

    let event: IncomingEvent;
    try {
      event = JSON.parse(typeof message === "string" ? message : textDecoder.decode(message));
    } catch {
      return;
    }

    try {
      if (event.type === "message" || event.type === "dm") {
        await this.handleChatMessage(ws, sender, event);
      } else if (event.type === "memberJoin" || event.type === "memberLeave") {
        await this.announceMembershipChange(sender, event.type, event.channelId);
      } else if (event.type && HUDDLE_SIGNAL_REQUIRED_FIELDS.has(event.type)) {
        await this.relayHuddleSignal(ws, sender, event);
      }
    } catch (error) {
      console.error(`Error handling ${event.type} event:`, error);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    ws.close();
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    console.error("WebSocket error in Durable Object");
    try {
      ws.close(1011, "Internal error");
    } catch {}
  }

  private async handleChatMessage(ws: WebSocket, sender: SocketUser, event: IncomingEvent): Promise<void> {
    const isDirectMessage = event.type === "dm";
    const targetId = isDirectMessage ? event.conversationId : event.channelId;
    const content = event.content?.trim() ?? "";
    if (!targetId || (!content && !event.attachmentKey)) {
      return;
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      this.sendError(ws, "Message too long");
      return;
    }

    const recipientEmails = isDirectMessage
      ? await this.conversationRecipients(targetId, sender.userEmail)
      : await this.channelRecipients(targetId, sender.userEmail);
    if (!recipientEmails) {
      this.sendError(ws, isDirectMessage ? "Not a participant in this conversation" : "Not a member of this channel");
      return;
    }

    const attachment = {
      attachmentKey: event.attachmentKey || null,
      attachmentName: event.attachmentName || null,
      attachmentType: event.attachmentType || null,
      attachmentSize: event.attachmentSize || null,
    };
    await this.env.DB.prepare(isDirectMessage ? INSERT_DIRECT_MESSAGE_SQL : INSERT_CHANNEL_MESSAGE_SQL)
      .bind(
        content,
        sender.userEmail,
        sender.userName,
        targetId,
        attachment.attachmentKey,
        attachment.attachmentName,
        attachment.attachmentType,
        attachment.attachmentSize,
      )
      .run();

    this.broadcast(recipientEmails, {
      type: event.type,
      [isDirectMessage ? "conversationId" : "channelId"]: targetId,
      content,
      userName: sender.userName,
      userEmail: sender.userEmail,
      ...attachment,
    });
  }

  private async announceMembershipChange(sender: SocketUser, type: string, channelId?: number): Promise<void> {
    if (!channelId) {
      return;
    }

    this.broadcast(await this.channelMemberEmails(channelId), {
      type,
      channelId,
      userEmail: sender.userEmail,
      userName: sender.userName,
    });
  }

  private async relayHuddleSignal(ws: WebSocket, sender: SocketUser, event: IncomingEvent): Promise<void> {
    const requiredField = HUDDLE_SIGNAL_REQUIRED_FIELDS.get(event.type ?? "");
    if (!event.conversationId || (requiredField && !event[requiredField])) {
      return;
    }

    const participants = await this.conversationRecipients(event.conversationId, sender.userEmail);
    if (!participants) {
      this.sendError(ws, "Not a participant in this conversation");
      return;
    }

    const otherParticipants = participants.filter((email) => email !== sender.userEmail);
    this.broadcast(otherParticipants, { ...event, userEmail: sender.userEmail, userName: sender.userName });
  }

  private async channelRecipients(channelId: number, senderEmail: string): Promise<string[] | null> {
    if (!(await isChannelMember(this.env.DB, channelId, senderEmail))) {
      return null;
    }
    return this.channelMemberEmails(channelId);
  }

  private async channelMemberEmails(channelId: number): Promise<string[]> {
    const { results } = await this.env.DB.prepare(
      "SELECT user_email AS email FROM channel_members WHERE channel_id = ?",
    )
      .bind(channelId)
      .all<{ email: string }>();
    return results.map((member) => member.email);
  }

  private async conversationRecipients(conversationId: number, senderEmail: string): Promise<string[] | null> {
    const conversation = await getConversationForParticipant(this.env.DB, conversationId, senderEmail);
    return conversation && [conversation.user1Email, conversation.user2Email];
  }

  private broadcast(recipientEmails: string[], payload: Record<string, unknown>): void {
    const message = JSON.stringify(payload);
    for (const socket of this.ctx.getWebSockets()) {
      const user = socket.deserializeAttachment() as SocketUser | null;
      if (user && recipientEmails.includes(user.userEmail)) {
        this.trySend(socket, message);
      }
    }
  }

  private sendError(ws: WebSocket, error: string): void {
    this.trySend(ws, JSON.stringify({ type: "error", error }));
  }

  private trySend(socket: WebSocket, message: string): void {
    try {
      socket.send(message);
    } catch {}
  }
}
