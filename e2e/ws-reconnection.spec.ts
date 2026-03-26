import { expect, test } from "@playwright/test";
import { loginWithMock, TEST_ORIGIN } from "./auth-helpers";

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
    // Patch WebSocket before the page loads so we can track all instances
    await page.addInitScript(() => {
      const sockets: WebSocket[] = [];
      const OriginalWebSocket = window.WebSocket;

      window.WebSocket = new Proxy(OriginalWebSocket, {
        construct(target, args) {
          const instance = new target(...(args as [string, string?]));
          sockets.push(instance);
          return instance;
        },
      });

      (window as unknown as { __testCloseAllWebSockets: () => void }).__testCloseAllWebSockets = () => {
        for (const s of sockets) {
          if (s.readyState === WebSocket.OPEN || s.readyState === WebSocket.CONNECTING) {
            s.close();
          }
        }
      };
    });

    await page.goto("/");

    // Wait for initial connection
    await expect(page.locator("#status")).toContainText("Connected", { timeout: 10000 });
    await expect(page.locator("#messageInput")).toBeEnabled();

    // Force close all WebSocket connections
    await page.evaluate(() => {
      (window as unknown as { __testCloseAllWebSockets: () => void }).__testCloseAllWebSockets();
    });

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
    await page.addInitScript(() => {
      const sockets: WebSocket[] = [];
      const OriginalWebSocket = window.WebSocket;

      window.WebSocket = new Proxy(OriginalWebSocket, {
        construct(target, args) {
          const instance = new target(...(args as [string, string?]));
          sockets.push(instance);
          return instance;
        },
      });

      (window as unknown as { __testCloseAllWebSockets: () => void }).__testCloseAllWebSockets = () => {
        for (const s of sockets) {
          if (s.readyState === WebSocket.OPEN || s.readyState === WebSocket.CONNECTING) {
            s.close();
          }
        }
      };
    });

    await page.goto("/");
    await expect(page.locator("#status")).toContainText("Connected", { timeout: 10000 });

    // Close WebSocket and wait for reconnection
    await page.evaluate(() => {
      (window as unknown as { __testCloseAllWebSockets: () => void }).__testCloseAllWebSockets();
    });
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
