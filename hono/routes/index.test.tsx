import type { Hono } from "hono";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestApp } from "../testApp.js";
import type { Variables } from "../types.js";

describe("Root page", () => {
  let testApp: Hono<{ Variables: Variables }>;

  beforeEach(async () => {
    // Create a test app with an authenticated user
    const { app } = createTestApp({
      authenticatedUser: {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        picture: "https://via.placeholder.com/32",
      },
    });
    testApp = app;

    // Add the index route to the test app
    const { index } = await import("./index.js");
    testApp.route("/", index);
  });

  it("should return HTML page with chat interface when user is logged in", async () => {
    const response = await testApp.request("/");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=UTF-8");

    const html = await response.text();
    expect(html).toContain('<h1 class="page-title">Hello, world!</h1>');
    expect(html).toContain("MLack - Real-time Chat");
    expect(html).toContain("Type your message...");
    expect(html).toContain('src="/static/ChatPage.js"');
    expect(html).toContain("test@example.com");
  });

  it("should have proper HTML5 structure with unescaped DOCTYPE", async () => {
    const response = await testApp.request("/");
    const html = await response.text();

    // Verify DOCTYPE is at the beginning and not escaped
    expect(html).toMatch(/^<!DOCTYPE html><html/);

    // Verify DOCTYPE is not escaped anywhere in the document
    expect(html).not.toContain("&lt;!DOCTYPE html&gt;");
  });

  it("should include WebSocket URL in data attribute", async () => {
    const response = await testApp.request("http://localhost:3000/");
    const html = await response.text();

    // Should contain the WebSocket URL data attribute
    expect(html).toContain('data-ws-url="ws://localhost:3000/ws"');
  });

  it("should construct correct WebSocket URL when X-Forwarded-Proto header is https", async () => {
    const response = await testApp.request("http://example.com/", {
      headers: {
        "x-forwarded-proto": "https",
      },
    });

    const html = await response.text();

    // Should use wss:// for HTTPS requests
    expect(html).toContain('data-ws-url="wss://example.com/ws"');
  });

  it("should redirect to Google auth when user is not logged in", async () => {
    // Create a test app with an unauthenticated user
    const { app: testAppNoAuth } = createTestApp({ authenticatedUser: null });

    // Add the index route to the test app
    const { index } = await import("./index.js");
    testAppNoAuth.route("/", index);

    const response = await testAppNoAuth.request("/");

    // Expect a redirect to Google auth
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("/auth/google");
  });

  it("should return the About page without authentication", async () => {
    // Create a test app with an unauthenticated user
    const { app: testAppNoAuth } = createTestApp({ authenticatedUser: null });

    // Add the index route to the test app
    const { index } = await import("./index.js");
    testAppNoAuth.route("/", index);

    const response = await testAppNoAuth.request("/about");

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/html; charset=UTF-8");

    const html = await response.text();

    // Check for About page specific content
    expect(html).toContain("<title>About - Mlack</title>");
    expect(html).toContain("About Mlack");
    expect(html).toContain("Slack-like application that&#39;s fully open source");
    expect(html).toContain("@mahata/mlack");
    expect(html).toContain("GitHub Copilot Coding Agent");
    expect(html).toContain("Vibe Coding");
    expect(html).toContain("← Back to Chat");
    expect(html).toContain('href="/components/AboutPage.css"');
  });
});
