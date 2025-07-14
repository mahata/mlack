import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

export async function loginWithGoogle(page: Page) {
  const gmailAccount = process.env.E2E_GMAIL_ACCOUNT;
  const gmailPassword = process.env.E2E_GMAIL_PASSWORD;

  if (!gmailAccount || !gmailPassword) {
    throw new Error("E2E_GMAIL_ACCOUNT and E2E_GMAIL_PASSWORD must be set");
  }

  // ホームページにアクセス（自動的にGoogleログインにリダイレクトされる）
  await page.goto("/");

  // Googleログインページが表示されるまで待機
  await page.waitForURL(/accounts\.google\.com/, { timeout: 10000 });

  // メールアドレスを入力
  await page.locator('input[type="email"]').fill(gmailAccount);
  await page.locator("#identifierNext").click();

  // パスワード入力ページが表示されるまで待機
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });

  // パスワードを入力
  await page.locator('input[type="password"]').fill(gmailPassword);
  await page.locator("#passwordNext").click();

  // ログイン後、アプリケーションにリダイレクトされることを確認
  await page.waitForURL("http://127.0.0.1:3000/", { timeout: 30000 });

  // ユーザー情報が表示されることを確認
  await expect(page.locator(".user-email")).toContainText(gmailAccount, { timeout: 10000 });
}

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
