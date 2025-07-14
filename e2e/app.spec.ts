import { expect, test } from "@playwright/test";
import { loginWithMock } from "./auth-helpers";

test.beforeEach(async ({ page }) => {
  // Wait for a server to be ready before running tests
  await page.goto("/health");
  await expect(page.locator("body")).toContainText("ok");

  // E2Eテスト用にモックログインを実行
  await loginWithMock(page);
});

test.afterEach(async ({ page }) => {
  // テスト終了後にログアウト
  await page.request.post("/test/logout");
});

test("App renders Hello, world! text", async ({ page }) => {
  await page.goto("/");

  // ユーザー情報が表示されていることを確認
  await expect(page.locator(".user-email")).toContainText(process.env.E2E_GMAIL_ACCOUNT || "test@example.com");

  // Verify that the page contains "Hello, world!" heading
  await expect(page.locator("h1")).toContainText("Hello, world!");

  // Verify that the page title is correct
  await expect(page).toHaveTitle("MLack - Real-time Chat");

  // Verify that the page contains chat interface elements
  await expect(page.locator("#messageInput")).toBeVisible();
  await expect(page.locator("#sendButton")).toBeVisible();
  await expect(page.locator("#messages")).toBeVisible();
});

test("WebSocket connection status changes from Connecting to Connected", async ({ page }) => {
  await page.goto("/");

  // Wait for the WebSocket connection to be established and status to change to "Connected"
  await expect(page.locator("#status")).toContainText("Connected", { timeout: 10000 });

  // Verify that the input and button are enabled after connection
  await expect(page.locator("#messageInput")).toBeEnabled();
  await expect(page.locator("#sendButton")).toBeEnabled();
});

test("Send message and verify it appears in messages div", async ({ page }) => {
  await page.goto("/");

  // Wait for WebSocket connection to be established
  await expect(page.locator("#status")).toContainText("Connected", { timeout: 10000 });

  const testMessage =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

  // Type the test message in the input field
  await page.locator("#messageInput").fill(testMessage);

  // Click the Send button
  await page.locator("#sendButton").click();

  // Verify that the message appears in the messages div
  await expect(page.locator("#messages")).toContainText(testMessage);

  // Verify that the input field is cleared after sending
  await expect(page.locator("#messageInput")).toHaveValue("");
});

test("Logout functionality works correctly", async ({ page }) => {
  // 既にbeforeEachでログインされているので、ページに移動
  await page.goto("/");

  // ユーザー情報が表示されていることを確認
  await expect(page.locator(".user-email")).toBeVisible();

  // ログアウトボタンをクリック
  await page.locator(".logout-button").click();

  // ログアウト後はGoogleログインページにリダイレクトされることを確認
  await expect(page).toHaveURL(/accounts\.google\.com/);
});
