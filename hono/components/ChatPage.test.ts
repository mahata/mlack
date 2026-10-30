import { describe, expect, it } from "vitest";
import { ChatPage } from "./ChatPage.js";

const html = String(await ChatPage({ email: "test@example.com", name: "Test User" }));

describe("ChatPage component", () => {
  it("should render a full document with the shared and chat stylesheets", () => {
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("<title>Mlack</title>");
    expect(html).toContain("viewport-fit=cover");
    expect(html).toContain('href="/components/common.css"');
    expect(html).toContain('href="/components/ChatPage.css"');
    expect(html).toContain('src="/static/ChatPage.js"');
  });

  it("should show the signed-in user and the initial connection status", () => {
    expect(html).toContain('<span class="user-email">test@example.com</span>');
    expect(html).toContain('<div id="status" class="status disconnected">Connecting...</div>');
  });

  it.each([
    ["the heading", "<h1>Hello, world!</h1>"],
    ["the sidebar header", '<div class="sidebar-header"><h2>Mlack</h2></div>'],
    ["the message input area", 'class="input-container"'],
    ["the members panel", '<aside id="membersPanel" class="members-panel">'],
    ["the members toggle", 'id="toggleMembersButton"'],
    ["the hidden create channel modal", '<div id="createChannelModal" class="modal hidden">'],
    ["the hidden DM compose modal", 'id="dmComposeModal" class="modal hidden"'],
    ["the hidden huddle start button", 'class="start-huddle-button hidden"'],
    ["the hidden incoming huddle banner", 'class="huddle-incoming-banner hidden"'],
    ["the huddle accept button", 'id="huddleAcceptButton"'],
    ["the huddle decline button", 'id="huddleDeclineButton"'],
    ["the hidden huddle bar", 'class="huddle-bar hidden"'],
    ["the huddle mute button", 'id="huddleMuteButton"'],
    ["the huddle end button", 'id="huddleEndButton"'],
    ["the huddle audio element", '<audio id="remoteAudio" autoplay="">'],
  ])("should include %s", (_name, markup) => {
    expect(html).toContain(markup);
  });

  it("should not render any workspace controls", () => {
    expect(html).not.toContain("data-workspace-slug");
    expect(html).not.toContain('id="createWorkspaceButton"');
    expect(html).not.toContain("/static/workspaceModal.js");
  });
});
