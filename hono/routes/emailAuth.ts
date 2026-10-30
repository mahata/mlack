import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import {
  createExpiresAt,
  generateVerificationCode,
  isExpired,
  sendVerificationEmail,
} from "../auth/emailVerification.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { createRateLimiter } from "../auth/rateLimiter.js";
import { startSession } from "../auth/session.js";
import { LoginPage } from "../components/LoginPage.js";
import { RegisterPage } from "../components/RegisterPage.js";
import { VerifyEmailPage } from "../components/VerifyEmailPage.js";
import type { Bindings, Env } from "../types.js";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MESSAGE = "Too many attempts. Please try again later.";

const loginRateLimiter = createRateLimiter("auth-login", {
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxRequests: 10,
  onLimitExceeded: (c) => c.html(LoginPage(RATE_LIMIT_MESSAGE), 429),
});
const registerRateLimiter = createRateLimiter("auth-register", {
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxRequests: 5,
  onLimitExceeded: (c) => c.html(RegisterPage(RATE_LIMIT_MESSAGE), 429),
});
const verifyRateLimiter = createRateLimiter("auth-verify", {
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxRequests: 10,
  onLimitExceeded: (c) => {
    const email = c.req.query("email") || "";
    return c.html(VerifyEmailPage({ email, error: RATE_LIMIT_MESSAGE }), 429);
  },
});
const resendRateLimiter = createRateLimiter("auth-resend", {
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxRequests: 5,
  onLimitExceeded: (c) => {
    const email = c.req.query("email") || "";
    return c.html(VerifyEmailPage({ email, error: RATE_LIMIT_MESSAGE }), 429);
  },
});

const emailAuthRoute = new Hono<Env>();

async function sendOrLogVerificationEmail(
  env: Bindings,
  email: string,
  verificationCode: string,
): Promise<{ success: boolean }> {
  if (env.NODE_ENV === "development") {
    console.log(`[DEV] Verification code for ${email}: ${verificationCode}`);
    return { success: true };
  }
  return sendVerificationEmail(env.RESEND_API_KEY, env.RESEND_FROM_EMAIL, email, verificationCode);
}

emailAuthRoute.get("/auth/login", (c) => c.html(LoginPage()));

emailAuthRoute.post("/auth/login", loginRateLimiter, async (c) => {
  try {
    const body = await c.req.parseBody();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return c.html(LoginPage("Email and password are required."), 400);
    }

    const user = await c.env.DB.prepare("SELECT email, name, password_hash AS passwordHash FROM users WHERE email = ?")
      .bind(email)
      .first<{ email: string; name: string; passwordHash: string }>();

    if (!user) {
      return c.html(LoginPage("Invalid email or password."), 401);
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return c.html(LoginPage("Invalid email or password."), 401);
    }

    await startSession(c, { email: user.email, name: user.name });

    return c.redirect("/");
  } catch (error) {
    console.error("Login error:", error);
    return c.html(LoginPage("Login failed. Please try again."), 500);
  }
});

emailAuthRoute.get("/auth/register", (c) => c.html(RegisterPage()));

emailAuthRoute.post("/auth/register", registerRateLimiter, async (c) => {
  try {
    const body = await c.req.parseBody();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!name || !email || !password) {
      return c.html(RegisterPage("All fields are required."), 400);
    }

    if (password.length < 8) {
      return c.html(RegisterPage("Password must be at least 8 characters."), 400);
    }

    const db = c.env.DB;
    const existingUser = await db.prepare("SELECT 1 FROM users WHERE email = ?").bind(email).first();
    if (existingUser) {
      return c.html(RegisterPage("An account with this email already exists."), 409);
    }

    const passwordHash = await hashPassword(password);
    const verificationCode = generateVerificationCode();
    const expiresAt = createExpiresAt();

    await db.prepare("DELETE FROM pending_registrations WHERE expires_at < ?").bind(new Date().toISOString()).run();

    await db
      .prepare(
        `INSERT INTO pending_registrations (email, name, password_hash, verification_code, expires_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (email) DO UPDATE SET name = excluded.name, password_hash = excluded.password_hash,
           verification_code = excluded.verification_code, expires_at = excluded.expires_at`,
      )
      .bind(email, name, passwordHash, verificationCode, expiresAt)
      .run();

    const emailResult = await sendOrLogVerificationEmail(c.env, email, verificationCode);
    if (!emailResult.success) {
      return c.html(RegisterPage("Failed to send verification email. Please try again."), 500);
    }

    return c.redirect(`/auth/verify-email?email=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error("Registration error:", error);
    return c.html(RegisterPage("Registration failed. Please try again."), 500);
  }
});

emailAuthRoute.get("/auth/verify-email", async (c) => {
  const email = c.req.query("email");
  if (!email) {
    return c.redirect("/auth/register");
  }
  return c.html(VerifyEmailPage({ email }));
});

emailAuthRoute.post("/auth/verify-email", verifyRateLimiter, async (c) => {
  let email = "";
  try {
    const body = await c.req.parseBody();
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!email || !code) {
      return c.html(VerifyEmailPage({ email: email || "", error: "Email and code are required." }), 400);
    }

    const db = c.env.DB;
    const pending = await db
      .prepare(
        `SELECT name, password_hash AS passwordHash, verification_code AS verificationCode, expires_at AS expiresAt
         FROM pending_registrations WHERE email = ?`,
      )
      .bind(email)
      .first<{ name: string; passwordHash: string; verificationCode: string; expiresAt: string }>();
    const deletePending = db.prepare("DELETE FROM pending_registrations WHERE email = ?").bind(email);

    if (!pending) {
      return c.html(VerifyEmailPage({ email, error: "No pending registration found. Please register again." }), 400);
    }

    if (isExpired(pending.expiresAt)) {
      await deletePending.run();
      return c.html(VerifyEmailPage({ email, error: "Verification code has expired. Please register again." }), 400);
    }

    const storedCodeBuffer = Buffer.from(pending.verificationCode);
    const submittedCodeBuffer = Buffer.from(code);
    const codeMatches =
      storedCodeBuffer.length === submittedCodeBuffer.length && timingSafeEqual(storedCodeBuffer, submittedCodeBuffer);
    if (!codeMatches) {
      return c.html(VerifyEmailPage({ email, error: "Invalid verification code." }), 400);
    }

    await db
      .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)")
      .bind(email, pending.name, pending.passwordHash)
      .run();
    await deletePending.run();

    await startSession(c, { email, name: pending.name });

    return c.redirect("/");
  } catch (error) {
    console.error("Verification error:", error);
    return c.html(VerifyEmailPage({ email, error: "Verification failed. Please try again." }), 500);
  }
});

emailAuthRoute.post("/auth/resend-code", resendRateLimiter, async (c) => {
  let email = "";
  try {
    const body = await c.req.parseBody();
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email) {
      return c.redirect("/auth/register");
    }

    const verificationCode = generateVerificationCode();
    const { meta } = await c.env.DB.prepare(
      "UPDATE pending_registrations SET verification_code = ?, expires_at = ? WHERE email = ?",
    )
      .bind(verificationCode, createExpiresAt(), email)
      .run();

    if (meta.changes === 0) {
      return c.html(VerifyEmailPage({ email, error: "No pending registration found. Please register again." }), 400);
    }

    const emailResult = await sendOrLogVerificationEmail(c.env, email, verificationCode);
    if (!emailResult.success) {
      return c.html(VerifyEmailPage({ email, error: "Failed to resend verification email. Please try again." }), 500);
    }

    return c.html(VerifyEmailPage({ email, success: "A new verification code has been sent." }));
  } catch (error) {
    console.error("Resend code error:", error);
    return c.html(VerifyEmailPage({ email, error: "Failed to resend code. Please try again." }), 500);
  }
});

export { emailAuthRoute };
