import type { WebSocketRoute } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { loginWithMock, TEST_ORIGIN } from "./auth-helpers";

function proxyWebSocket(ws: WebSocketRoute): WebSocketRoute {
  const server = ws.connectToServer();

  ws.onMessage((message) => {
    server.send(message);
  });

  server.onMessage((message) => {
    ws.send(message);
  });

  server.onClose((code, reason) => {
    ws.close({ code, reason });
  });

  return ws;
}

function closeWebSocketRoute(route: WebSocketRoute | null): void {
  expect(route).not.toBeNull();
  (route as WebSocketRoute).close({ code: 1000, reason: "test disconnect" });
}

test.describe("WebSocket Reconnection", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/health");
    await expect(page.locator("body")).toContainText("ok");

    await loginWithMock(page);
  });

  test.afterEach(async ({ page }) => {
    await page.request.post("/test/logout", {
      headers: { Origin: TEST_ORIGIN },
    });
  });

  test("reconnects automatically after WebSocket is closed", async ({ page }) => {
    let activeWsRoute: WebSocketRoute | null = null;

    await page.routeWebSocket(/\/ws/, (ws) => {
      activeWsRoute = proxyWebSocket(ws);
    });

    await page.goto("/");

    // Wait for initial connection
    await expect(page.locator("#status")).toContainText("Connected", { timeout: 10000 });
    await expect(page.locator("#messageInput")).toBeEnabled();

    // Force close the WebSocket connection via Playwright's network layer
    closeWebSocketRoute(activeWsRoute);

    // Verify the UI shows a reconnecting state
    await expect(page.locator("#status")).toContainText("Reconnecting", { timeout: 5000 });
    await expect(page.locator("#messageInput")).toBeDisabled();
    await expect(page.locator("#sendButton")).toBeDisabled();

    // Verify the connection is automatically restored
    await expect(page.locator("#status")).toContainText("Connected", { timeout: 15000 });
    await expect(page.locator("#messageInput")).toBeEnabled();
    await expect(page.locator("#sendButton")).toBeEnabled();
  });

  test("can send messages after reconnection", async ({ page }) => {
    let activeWsRoute: WebSocketRoute | null = null;

    await page.routeWebSocket(/\/ws/, (ws) => {
      activeWsRoute = proxyWebSocket(ws);
    });

    await page.goto("/");
    await expect(page.locator("#status")).toContainText("Connected", { timeout: 10000 });

    // Close WebSocket and wait for reconnection
    closeWebSocketRoute(activeWsRoute);
    await expect(page.locator("#status")).toContainText("Connected", { timeout: 15000 });

    // Send a message after reconnection
    const testMessage = `Reconnect test ${Date.now()}`;
    await page.locator("#messageInput").fill(testMessage);
    await page.locator("#sendButton").click();

    // Verify the message appears
    await expect(page.locator("#messages")).toContainText(testMessage);
    await expect(page.locator("#messageInput")).toHaveValue("");
  });
});
