import { expect, test } from "@playwright/test";
import { loginWithMock } from "./auth-helpers";

test.describe("Database Message Persistence", () => {
  test.beforeEach(async ({ page }) => {
    // Wait for a server to be ready before running tests
    await page.goto("/health");
    await expect(page.locator("body")).toContainText("ok");

    await loginWithMock(page);
  });

  test.afterEach(async ({ page }) => {
    await page.request.post("/test/logout");
  });

  test("Message persists in database after page refresh", async ({ page }) => {
    // Navigate to the main chat page
    await page.goto("/");

    // Wait for WebSocket connection to be established
    await expect(page.locator("#status")).toContainText("Connected", { timeout: 10000 });

    // Create a unique test message to avoid conflicts with other tests
    const timestamp = Date.now();
    const testMessage = `E2E Database Test Message ${timestamp}`;

    // Clear any existing messages from the UI for clean state verification
    // Note: We don't clear the database as we want to test persistence across sessions

    // Type the test message in the input field
    await page.locator("#messageInput").fill(testMessage);

    // Click the Send button to send the message
    await page.locator("#sendButton").click();

    // Verify that the message appears in the messages div immediately
    await expect(page.locator("#messages")).toContainText(testMessage);

    // Verify that the input field is cleared after sending
    await expect(page.locator("#messageInput")).toHaveValue("");

    // Wait a moment to ensure the message is fully processed and saved to database
    await page.waitForTimeout(1000);

    // Refresh the page to simulate a new session
    await page.reload();

    // Wait for the page to load and authenticate again
    await loginWithMock(page);

    // Wait for WebSocket connection to be re-established
    await expect(page.locator("#status")).toContainText("Connected", { timeout: 10000 });

    // Wait for existing messages to load from the database
    await page.waitForTimeout(2000);

    // Verify that the previously sent message is still displayed
    // This confirms that the message was persisted in the database and loaded on page refresh
    await expect(page.locator("#messages")).toContainText(testMessage);
  });
});