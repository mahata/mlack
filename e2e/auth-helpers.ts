import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

export async function loginWithMock(page: Page) {
  // モックログインを使用（テスト環境用）
  const response = await page.request.post("/test/login");
  expect(response.ok()).toBeTruthy();

  // ホームページにアクセス
  await page.goto("/");

  // ユーザー情報が表示されることを確認
  const expectedEmail = process.env.E2E_GMAIL_ACCOUNT || "test@example.com";
  await expect(page.locator(".user-email")).toContainText(expectedEmail, { timeout: 10000 });
}
