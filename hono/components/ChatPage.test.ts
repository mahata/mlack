import { describe, expect, it } from "vitest";
import { ChatPage } from "./ChatPage.js";

describe("ChatPage component", () => {
  it("should include external script reference", async () => {
    const jsxElement = await ChatPage();

    // Convert JSX to string to test content
    const html = jsxElement.toString();
    expect(html).toContain('<script type="module" src="/static/chat-page-client.js"></script>');
  });

  it("should use hono/css Style component", async () => {
    const jsxElement = await ChatPage();

    // Convert JSX to string to test content
    const html = jsxElement.toString();
    // Should contain the Style component from hono/css
    expect(html).toContain('<style id="hono-css">');
  });

  it("should use CSS-in-JS class names", async () => {
    const jsxElement = await ChatPage();

    // Convert JSX to string to test content
    const html = jsxElement.toString();
    // Should contain generated CSS class names (they start with 'css-')
    expect(html).toMatch(/class="[^"]*css-[0-9]+[^"]*"/);
  });

  it("should include data attributes for client-side script", async () => {
    const jsxElement = await ChatPage();

    // Convert JSX to string to test content
    const html = jsxElement.toString();
    // Should contain data attributes needed by the client script
    expect(html).toContain("data-status-class=");
    expect(html).toContain("data-connected-class=");
    expect(html).toContain("data-disconnected-class=");
    expect(html).toContain("data-message-class=");
  });
});
