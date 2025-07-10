import { describe, expect, it } from "vitest";
import { index } from "./index.js";

describe("Root page", () => {
  it("should return HTML page with chat interface", async () => {
    const response = await index.request("/");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=UTF-8");

    const html = await response.text();
    expect(html).toContain('<h1 class="page-title">Hello, world!</h1>');
    expect(html).toContain("MLack - Real-time Chat");
    expect(html).toContain("Type your message...");
    expect(html).toContain('src="/static/ChatPage.js"');
  });

  it("should have proper HTML5 structure with unescaped DOCTYPE", async () => {
    const response = await index.request("/");
    const html = await response.text();

    // Verify DOCTYPE is at the beginning and not escaped
    expect(html).toMatch(/^<!DOCTYPE html><html/);

    // Verify DOCTYPE is not escaped anywhere in the document
    expect(html).not.toContain("&lt;!DOCTYPE html&gt;");
  });
});
