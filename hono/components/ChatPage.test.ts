import { describe, expect, it } from "vitest";
import { ChatPage } from "./ChatPage.js";

describe("ChatPage component", () => {
  it("should include WebSocket functionality via external script", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain('src="/static/ChatPage.js"');
  });

  it("should include CSS stylesheet", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain('href="/components/ChatPage.css"');
  });

  it("should use CSS classes instead of CSS-in-JS", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain('class="app-layout"');
    expect(html).toContain('class="status disconnected"');
    expect(html).toContain('class="input-container"');
    expect(html).not.toMatch(/class="[^"]*css-[0-9]+[^"]*"/);
  });

  it("should include default WebSocket URL when none provided", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain('data-ws-url="ws://localhost:3000/ws"');
  });

  it("should include Hello, world! heading", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain("<h1>Hello, world!</h1>");
  });

  it("should include custom WebSocket URL when provided", async () => {
    const customWsUrl = "wss://example.com/ws";
    const jsxElement = await ChatPage(customWsUrl);

    const html = jsxElement.toString();
    expect(html).toContain(`data-ws-url="${customWsUrl}"`);
  });

  it("should include members panel", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain('id="membersPanel"');
    expect(html).toContain('id="membersList"');
    expect(html).toContain('class="members-panel"');
  });

  it("should include toggle members button", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain('id="toggleMembersButton"');
    expect(html).toContain("Members");
  });

  it("should show the app name in the title and sidebar header", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain("<title>Mlack</title>");
    expect(html).toContain('<div class="sidebar-header"><h2>Mlack</h2></div>');
  });

  it("should not render any workspace controls", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).not.toContain("data-workspace-slug");
    expect(html).not.toContain('id="createWorkspaceButton"');
    expect(html).not.toContain('id="createWorkspaceModal"');
    expect(html).not.toContain("/static/workspaceModal.js");
  });

  it("should include start huddle button hidden by default", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain('id="startHuddleButton"');
    expect(html).toContain("start-huddle-button hidden");
    expect(html).toContain('title="Start a huddle"');
  });

  it("should include huddle incoming call banner hidden by default", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain('id="huddleIncomingBanner"');
    expect(html).toContain("huddle-incoming-banner hidden");
    expect(html).toContain('id="huddleCallerName"');
    expect(html).toContain("is starting a huddle");
  });

  it("should include huddle accept and decline buttons", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain('id="huddleAcceptButton"');
    expect(html).toContain("huddle-accept-button");
    expect(html).toContain('id="huddleDeclineButton"');
    expect(html).toContain("huddle-decline-button");
  });

  it("should include huddle bar hidden by default", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain('id="huddleBar"');
    expect(html).toContain("huddle-bar hidden");
    expect(html).toContain('id="huddleStatus"');
  });

  it("should include huddle mute and end buttons", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain('id="huddleMuteButton"');
    expect(html).toContain('id="huddleEndButton"');
    expect(html).toContain("huddle-end-button");
  });

  it("should include remote audio element for huddle", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain('id="remoteAudio"');
    expect(html).toContain("autoplay");
  });
});
