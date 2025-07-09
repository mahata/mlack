import { describe, expect, it } from "vitest";
import { ChatPage } from "./ChatPage.js";

describe("ChatPage component", () => {
  it("should include WebSocket functionality", () => {
    const html = ChatPage();

    expect(html).toContain("WebSocket('ws://localhost:3000/ws')");
  });
});
