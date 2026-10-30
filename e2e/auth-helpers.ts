import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export const TEST_ORIGIN = "http://localhost:3015";
export const TEST_USER_EMAIL = "test@example.com";

export async function loginWithMock(page: Page) {
  // Mock login request to the test endpoint
  const response = await page.request.post("/test/login", {
    headers: { Origin: TEST_ORIGIN },
  });
  expect(response.ok()).toBeTruthy();

  await page.goto("/");

  // Verify that the user info is displayed correctly
  await expect(page.locator(".user-email")).toContainText(TEST_USER_EMAIL, { timeout: 10000 });
}
