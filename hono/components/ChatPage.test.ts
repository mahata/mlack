import { describe, expect, it } from "vitest";
import { ChatPage } from "./ChatPage.js";

describe("ChatPage component", () => {
  it("should include WebSocket functionality via external script", async () => {
    const jsxElement = await ChatPage();

    // Convert JSX to string to test content
    const html = jsxElement.toString();
    expect(html).toContain('src="/static/ChatPage.js"');
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
});
