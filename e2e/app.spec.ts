import { expect, test } from "@playwright/test";

test("App renders Hello, world! text", async ({ page }) => {
  await page.goto("/");

  // Verify that the page contains "Hello, world!" heading
  await expect(page.locator("h1")).toContainText("Hello, world!");

  // Verify that the page title is correct
  await expect(page).toHaveTitle("MLack - Real-time Chat");

  // Verify that the page contains chat interface elements
  await expect(page.locator("#messageInput")).toBeVisible();
  await expect(page.locator("#sendButton")).toBeVisible();
  await expect(page.locator("#messages")).toBeVisible();
});
