import { describe, expect, it } from "vitest";
import { index } from "./index";

describe("Root page", () => {
  it("should return HTML page with chat interface", async () => {
    const response = await index.request("/");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=UTF-8");

    const html = await response.text();
    expect(html).toContain("<h1>Hello, world!</h1>");
    expect(html).toContain("MLack - Real-time Chat");
    expect(html).toContain("Type your message...");
    expect(html).toContain("new WebSocket(");
  });
});
