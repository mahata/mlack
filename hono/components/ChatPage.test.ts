import { describe, expect, it } from "vitest";
import { ChatPage } from "./ChatPage.tsx";

describe("ChatPage component", () => {
  it("should include WebSocket functionality", () => {
    const jsxElement = ChatPage();

    // Convert JSX to string to test content
    const html = jsxElement.toString();
    expect(html).toContain("new WebSocket(");
  });
});
