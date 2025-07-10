import { describe, expect, it } from "vitest";
import { ChatPage } from "./ChatPage.js";

describe("ChatPage component", () => {
  it("should include WebSocket functionality via external script", async () => {
    const jsxElement = await ChatPage();

    // Convert JSX to string to test content
    const html = jsxElement.toString();
    expect(html).toContain('src="/static/ChatPage.js"');
  });

  it("should include CSS stylesheet", async () => {
    const jsxElement = await ChatPage();

    // Convert JSX to string to test content
    const html = jsxElement.toString();
    // Should contain the CSS stylesheet link
    expect(html).toContain('href="/components/ChatPage.css"');
  });

  it("should use CSS classes instead of CSS-in-JS", async () => {
    const jsxElement = await ChatPage();

    // Convert JSX to string to test content
    const html = jsxElement.toString();
    // Should contain the new CSS class names
    expect(html).toContain('class="chat-container"');
    expect(html).toContain('class="status disconnected"');
    expect(html).toContain('class="input-container"');
    // Should not contain generated CSS class names (they start with 'css-')
    expect(html).not.toMatch(/class="[^"]*css-[0-9]+[^"]*"/);
  });

  it("should include default WebSocket URL when none provided", async () => {
    const jsxElement = await ChatPage();

    // Convert JSX to string to test content
    const html = jsxElement.toString();
    expect(html).toContain('data-ws-url="ws://localhost:3000/ws"');
  });

  it("should include custom WebSocket URL when provided", async () => {
    const customWsUrl = "wss://example.com/ws";
    const jsxElement = await ChatPage(customWsUrl);

    // Convert JSX to string to test content
    const html = jsxElement.toString();
    expect(html).toContain(`data-ws-url="${customWsUrl}"`);
  });
});
