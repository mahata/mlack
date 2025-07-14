import { expect, test } from "@playwright/test";
import { loginWithGoogle } from "./auth-helpers";

// 実際のGoogleアカウントを使ったログインテスト
// CI環境や必要に応じて実行
test.describe("Google Authentication E2E", () => {
  test.skip(!process.env.RUN_GOOGLE_AUTH_TESTS, "Google auth tests skipped - set RUN_GOOGLE_AUTH_TESTS=true to enable");

  test("Login with real Google account", async ({ page }) => {
    await loginWithGoogle(page);

    // ログイン後の基本機能をテスト
    await expect(page.locator("h1")).toContainText("Hello, world!");
    await expect(page.locator("#messageInput")).toBeVisible();
    await expect(page.locator("#sendButton")).toBeVisible();
  });

  test("Logout with real Google account", async ({ page }) => {
    await loginWithGoogle(page);

    // ログアウトボタンをクリック
    await page.locator(".logout-button").click();

    // ログアウト後はGoogleログインページにリダイレクトされることを確認
    await expect(page).toHaveURL(/accounts\.google\.com/);
  });
});
