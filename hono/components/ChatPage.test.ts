import { describe, expect, it } from "vitest";
import { ChatPage } from "./ChatPage.js";

describe("ChatPage component", () => {
	it("should return HTML string with all required elements", () => {
		const html = ChatPage();

		expect(html).toContain("<html lang=\"en\">");
		expect(html).toContain("<title>MLack - Real-time Chat</title>");
		expect(html).toContain("<h1>Hello, world!</h1>");
		expect(html).toContain('id="status"');
		expect(html).toContain('id="messages"');
		expect(html).toContain('id="messageInput"');
		expect(html).toContain('id="sendButton"');
		expect(html).toContain("WebSocket('ws://localhost:3000/ws')");
	});

	it("should return valid HTML structure", () => {
		const html = ChatPage();

		expect(html).toContain("<html lang=\"en\">");
		expect(html).toContain("<head>");
		expect(html).toContain("</head>");
		expect(html).toContain("<body>");
		expect(html).toContain("</body>");
		expect(html).toContain("</html>");
	});

	it("should include CSS styles", () => {
		const html = ChatPage();

		expect(html).toContain("<style>");
		expect(html).toContain("font-family: Arial, sans-serif");
		expect(html).toContain("background-color: #f5f5f5");
		expect(html).toContain(".container");
		expect(html).toContain("#messages");
	});

	it("should include JavaScript functionality", () => {
		const html = ChatPage();

		expect(html).toContain("<script>");
		expect(html).toContain("sendMessage");
		expect(html).toContain("ws.onopen");
		expect(html).toContain("ws.onmessage");
		expect(html).toContain("addEventListener");
	});
});