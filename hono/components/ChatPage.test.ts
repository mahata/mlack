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
    expect(html).toContain('data-ws-url="ws://localhost:3000/w/default/ws"');
  });

  it("should include Hello, world! heading", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain("<h1>Hello, world!</h1>");
  });

  it("should include custom WebSocket URL when provided", async () => {
    const customWsUrl = "wss://example.com/w/myworkspace/ws";
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

  it("should include workspace slug data attribute", async () => {
    const workspace = {
      id: 1,
      name: "Test Workspace",
      slug: "test-ws",
      createdByEmail: "admin@test.com",
      createdAt: "2025-01-01",
    };
    const jsxElement = await ChatPage("wss://example.com/ws", undefined, workspace);

    const html = jsxElement.toString();
    expect(html).toContain('data-workspace-slug="test-ws"');
  });

  it("should display workspace name in sidebar header", async () => {
    const workspace = {
      id: 1,
      name: "My Workspace",
      slug: "my-ws",
      createdByEmail: "admin@test.com",
      createdAt: "2025-01-01",
    };
    const jsxElement = await ChatPage("wss://example.com/ws", undefined, workspace);

    const html = jsxElement.toString();
    expect(html).toContain("My Workspace");
  });

  it("should include create workspace button in sidebar", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain('id="createWorkspaceButton"');
    expect(html).toContain('class="create-workspace-button"');
    expect(html).toContain('title="Create workspace"');
  });

  it("should include create workspace modal", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain('id="createWorkspaceModal"');
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="createWorkspaceTitle"');
  });

  it("should include workspace name and slug inputs in modal", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain('id="workspaceName"');
    expect(html).toContain('id="workspaceSlug"');
    expect(html).toContain('id="slugPreviewValue"');
  });

  it("should include workspace modal action buttons", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain('id="cancelCreateWorkspace"');
    expect(html).toContain('id="confirmCreateWorkspace"');
  });

  it("should include workspace modal error element", async () => {
    const jsxElement = await ChatPage();

    const html = jsxElement.toString();
    expect(html).toContain('id="createWorkspaceError"');
    expect(html).toContain("modal-error hidden");
  });
});
