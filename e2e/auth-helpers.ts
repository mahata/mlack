import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function loginWithMock(page: Page) {
  // Mock login request to the test endpoint
  const response = await page.request.post("/test/login");
  expect(response.ok()).toBeTruthy();

  await page.goto("/");

  // Verify that the user info is displayed correctly
  const expectedEmail = process.env.E2E_GMAIL_ACCOUNT || "test@example.com";
  await expect(page.locator(".user-email")).toContainText(expectedEmail, { timeout: 10000 });
}
