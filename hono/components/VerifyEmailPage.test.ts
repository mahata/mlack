import { describe, expect, it } from "vitest";
import { VerifyEmailPage } from "./VerifyEmailPage.js";

describe("VerifyEmailPage component", () => {
  const defaultProps = { email: "user@example.com" };

  it("should have proper HTML structure", async () => {
    const jsxElement = await VerifyEmailPage(defaultProps);
    const html = jsxElement.toString();

    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<title>Verify Email - MLack</title>");
    expect(html).toContain('class="auth-container"');
    expect(html).toContain('class="page-title"');
  });

  it("should include CSS stylesheet", async () => {
    const jsxElement = await VerifyEmailPage(defaultProps);
    const html = jsxElement.toString();

    expect(html).toContain('href="/components/AuthPage.css"');
  });

  it("should display the email address in the description", async () => {
    const jsxElement = await VerifyEmailPage({ email: "test@domain.com" });
    const html = jsxElement.toString();

    expect(html).toContain("test@domain.com");
    expect(html).toContain("We sent a 6-digit code to");
  });

  it("should contain verify form with correct action and hidden email input", async () => {
    const jsxElement = await VerifyEmailPage(defaultProps);
    const html = jsxElement.toString();

    expect(html).toContain('action="/auth/verify-email"');
    expect(html).toContain('method="post"');
    expect(html).toContain('type="hidden"');
    expect(html).toContain('name="email"');
    expect(html).toContain('value="user@example.com"');
  });

  it("should have code input with correct validation attributes", async () => {
    const jsxElement = await VerifyEmailPage(defaultProps);
    const html = jsxElement.toString();

    expect(html).toContain('name="code"');
    expect(html).toContain('pattern="[0-9]{6}"');
    expect(html).toContain('maxLength="6"');
    expect(html).toContain('minLength="6"');
    expect(html).toContain('inputMode="numeric"');
    expect(html).toContain('autoComplete="one-time-code"');
    expect(html).toContain("required");
  });

  it("should contain resend code form with correct action", async () => {
    const jsxElement = await VerifyEmailPage(defaultProps);
    const html = jsxElement.toString();

    expect(html).toContain('action="/auth/resend-code"');
    expect(html).toContain("Resend Code");
    expect(html).toContain("Didn&#39;t receive the code?");
  });

  it("should show error message when error prop is provided", async () => {
    const jsxElement = await VerifyEmailPage({ ...defaultProps, error: "Invalid code" });
    const html = jsxElement.toString();

    expect(html).toContain('class="error-message"');
    expect(html).toContain("Invalid code");
  });

  it("should not show error div when no error", async () => {
    const jsxElement = await VerifyEmailPage(defaultProps);
    const html = jsxElement.toString();

    expect(html).not.toContain('class="error-message"');
  });

  it("should show success message when success prop is provided", async () => {
    const jsxElement = await VerifyEmailPage({ ...defaultProps, success: "Code resent" });
    const html = jsxElement.toString();

    expect(html).toContain('class="success-message"');
    expect(html).toContain("Code resent");
  });

  it("should not show success div when no success", async () => {
    const jsxElement = await VerifyEmailPage(defaultProps);
    const html = jsxElement.toString();

    expect(html).not.toContain('class="success-message"');
  });

  it("should contain back to registration link", async () => {
    const jsxElement = await VerifyEmailPage(defaultProps);
    const html = jsxElement.toString();

    expect(html).toContain('href="/auth/register"');
    expect(html).toContain("Back to registration");
  });
});
