import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestEnv } from "../testApp.js";
import { ChatRoom } from "./ChatRoom.js";

vi.mock("cloudflare:workers", () => ({
  DurableObject: class {
    constructor(
      readonly ctx: unknown,
      readonly env: unknown,
    ) {}
  },
}));

vi.stubGlobal("WebSocketRequestResponsePair", class {});

type FakeSocket = WebSocket & { received: Array<Record<string, unknown>> };

function createSocket(userEmail: string): FakeSocket {
  const received: Array<Record<string, unknown>> = [];
  return {
    received,
    send: (message: string) => received.push(JSON.parse(message)),
    deserializeAttachment: () => ({ userEmail, userName: userEmail.split("@")[0] }),
  } as unknown as FakeSocket;
}

let env: ReturnType<typeof createTestEnv>;
let room: ChatRoom;
let alice: FakeSocket;
let bob: FakeSocket;
let carol: FakeSocket;

function send(socket: FakeSocket, event: Record<string, unknown>) {
  return room.webSocketMessage(socket, JSON.stringify(event));
}

function storedMessages(table: "messages" | "direct_messages") {
  return env.DB.prepare(`SELECT content, user_email AS userEmail FROM ${table}`).all();
}

beforeEach(async () => {
  env = createTestEnv();
  await env.DB.exec(`
    INSERT INTO channel_members (channel_id, user_email) VALUES (1, 'alice@example.com'), (1, 'bob@example.com');
    INSERT INTO direct_conversations (id, user1_email, user2_email) VALUES (7, 'alice@example.com', 'bob@example.com');
  `);
  alice = createSocket("alice@example.com");
  bob = createSocket("bob@example.com");
  carol = createSocket("carol@example.com");
  const ctx = { setWebSocketAutoResponse: vi.fn(), getWebSockets: () => [alice, bob, carol] };
  room = new ChatRoom(ctx as unknown as DurableObjectState, env);
});

describe("ChatRoom", () => {
  it("stores channel messages and delivers them only to channel members", async () => {
    await send(alice, { type: "message", channelId: 1, content: "  hello  " });

    expect((await storedMessages("messages")).results).toEqual([{ content: "hello", userEmail: "alice@example.com" }]);
    const delivered = {
      type: "message",
      channelId: 1,
      content: "hello",
      userEmail: "alice@example.com",
      userName: "alice",
      attachmentKey: null,
      attachmentName: null,
      attachmentType: null,
      attachmentSize: null,
    };
    expect(alice.received).toEqual([delivered]);
    expect(bob.received).toEqual([delivered]);
    expect(carol.received).toEqual([]);
  });

  it("rejects channel messages from non-members", async () => {
    await send(carol, { type: "message", channelId: 1, content: "hello" });

    expect(carol.received).toEqual([{ type: "error", error: "Not a member of this channel" }]);
    expect(alice.received).toEqual([]);
    expect((await storedMessages("messages")).results).toEqual([]);
  });

  it("rejects messages that are too long", async () => {
    await send(alice, { type: "message", channelId: 1, content: "x".repeat(4097) });

    expect(alice.received).toEqual([{ type: "error", error: "Message too long" }]);
  });

  it("stores direct messages and delivers them only to the participants", async () => {
    await send(bob, { type: "dm", conversationId: 7, content: "hi alice" });

    expect((await storedMessages("direct_messages")).results).toEqual([
      { content: "hi alice", userEmail: "bob@example.com" },
    ]);
    expect(alice.received).toMatchObject([{ type: "dm", conversationId: 7, content: "hi alice" }]);
    expect(bob.received).toHaveLength(1);
    expect(carol.received).toEqual([]);
  });

  it("rejects direct messages from non-participants", async () => {
    await send(carol, { type: "dm", conversationId: 7, content: "let me in" });

    expect(carol.received).toEqual([{ type: "error", error: "Not a participant in this conversation" }]);
    expect(alice.received).toEqual([]);
  });

  it("relays huddle signals only to the other participant", async () => {
    await send(alice, { type: "huddle-offer", conversationId: 7, offer: { type: "offer", sdp: "v=0" } });

    expect(bob.received).toEqual([
      {
        type: "huddle-offer",
        conversationId: 7,
        offer: { type: "offer", sdp: "v=0" },
        userEmail: "alice@example.com",
        userName: "alice",
      },
    ]);
    expect(alice.received).toEqual([]);
    expect(carol.received).toEqual([]);
  });

  it("announces membership changes to channel members with the sender's identity", async () => {
    await send(alice, { type: "memberJoin", channelId: 1, userEmail: "spoofed@example.com", userName: "Spoofed" });

    const announcement = { type: "memberJoin", channelId: 1, userEmail: "alice@example.com", userName: "alice" };
    expect(alice.received).toEqual([announcement]);
    expect(bob.received).toEqual([announcement]);
    expect(carol.received).toEqual([]);
  });
});
