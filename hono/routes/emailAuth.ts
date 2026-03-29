import { eq, lt } from "drizzle-orm";
import { Hono } from "hono";
import {
  createExpiresAt,
  generateVerificationCode,
  isExpired,
  sendVerificationEmail,
} from "../auth/emailVerification.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { LoginPage } from "../components/LoginPage.js";
import { RegisterPage } from "../components/RegisterPage.js";
import { VerifyEmailPage } from "../components/VerifyEmailPage.js";
import { getDb, pendingRegistrations, users } from "../db/index.js";
import type { Bindings, Variables } from "../types.js";

const emailAuth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

emailAuth.get("/auth/login", async (c) => {
  const error = c.req.query("error");
  let errorMessage: string | undefined;
  if (error === "invalid_credentials") {
    errorMessage = "Invalid email or password.";
  } else if (error === "login_failed") {
    errorMessage = "Login failed. Please try again.";
  }
  return c.html(`<!DOCTYPE html>${await LoginPage(errorMessage)}`);
});

emailAuth.post("/auth/login", async (c) => {
  try {
    const body = await c.req.parseBody();
    const email = body.email as string;
    const password = body.password as string;

    if (!email || !password) {
      return c.html(`<!DOCTYPE html>${await LoginPage("Email and password are required.")}`, 400);
    }

    const db = getDb(c.env.DB);
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      return c.html(`<!DOCTYPE html>${await LoginPage("Invalid email or password.")}`, 401);
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return c.html(`<!DOCTYPE html>${await LoginPage("Invalid email or password.")}`, 401);
    }

    const session = c.get("session");
    session.set("user", {
      email: user.email,
      name: user.name,
    });

    return c.redirect("/");
  } catch (error) {
    console.error("Login error:", error);
    return c.html(`<!DOCTYPE html>${await LoginPage("Login failed. Please try again.")}`, 500);
  }
});

emailAuth.get("/auth/register", async (c) => {
  const error = c.req.query("error");
  let errorMessage: string | undefined;
  if (error === "email_exists") {
    errorMessage = "An account with this email already exists.";
  } else if (error === "registration_failed") {
    errorMessage = "Registration failed. Please try again.";
  }
  return c.html(`<!DOCTYPE html>${await RegisterPage(errorMessage)}`);
});

emailAuth.post("/auth/register", async (c) => {
  try {
    const body = await c.req.parseBody();
    const name = body.name as string;
    const email = body.email as string;
    const password = body.password as string;

    if (!name || !email || !password) {
      return c.html(`<!DOCTYPE html>${await RegisterPage("All fields are required.")}`, 400);
    }

    if (password.length < 8) {
      return c.html(`<!DOCTYPE html>${await RegisterPage("Password must be at least 8 characters.")}`, 400);
    }

    const db = getDb(c.env.DB);
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return c.html(`<!DOCTYPE html>${await RegisterPage("An account with this email already exists.")}`, 409);
    }

    const passwordHash = await hashPassword(password);
    const verificationCode = generateVerificationCode();
    const expiresAt = createExpiresAt();

    await db.delete(pendingRegistrations).where(lt(pendingRegistrations.expiresAt, new Date().toISOString()));

    await db
      .insert(pendingRegistrations)
      .values({ email, name, passwordHash, verificationCode, expiresAt })
      .onConflictDoUpdate({
        target: pendingRegistrations.email,
        set: { name, passwordHash, verificationCode, expiresAt },
      });

    if (c.env.NODE_ENV === "development") {
      console.log(`[DEV] Verification code for ${email}: ${verificationCode}`);
    } else {
      const emailResult = await sendVerificationEmail(
        c.env.RESEND_API_KEY,
        c.env.RESEND_FROM_EMAIL,
        email,
        verificationCode,
      );
      if (!emailResult.success) {
        return c.html(
          `<!DOCTYPE html>${await RegisterPage("Failed to send verification email. Please try again.")}`,
          500,
        );
      }
    }

    return c.redirect(`/auth/verify-email?email=${encodeURIComponent(email)}`);
  } catch (error) {
    console.error("Registration error:", error);
    return c.html(`<!DOCTYPE html>${await RegisterPage("Registration failed. Please try again.")}`, 500);
  }
});

emailAuth.get("/auth/verify-email", async (c) => {
  const email = c.req.query("email");
  if (!email) {
    return c.redirect("/auth/register");
  }
  return c.html(`<!DOCTYPE html>${await VerifyEmailPage({ email })}`);
});

emailAuth.post("/auth/verify-email", async (c) => {
  try {
    const body = await c.req.parseBody();
    const email = body.email as string;
    const code = body.code as string;

    if (!email || !code) {
      return c.html(
        `<!DOCTYPE html>${await VerifyEmailPage({ email: email || "", error: "Email and code are required." })}`,
        400,
      );
    }

    const db = getDb(c.env.DB);
    const [pending] = await db
      .select()
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.email, email))
      .limit(1);

    if (!pending) {
      return c.html(
        `<!DOCTYPE html>${await VerifyEmailPage({ email, error: "No pending registration found. Please register again." })}`,
        400,
      );
    }

    if (isExpired(pending.expiresAt)) {
      await db.delete(pendingRegistrations).where(eq(pendingRegistrations.email, email));
      return c.html(
        `<!DOCTYPE html>${await VerifyEmailPage({ email, error: "Verification code has expired. Please register again." })}`,
        400,
      );
    }

    if (pending.verificationCode !== code) {
      return c.html(`<!DOCTYPE html>${await VerifyEmailPage({ email, error: "Invalid verification code." })}`, 400);
    }

    await db.insert(users).values({
      email: pending.email,
      name: pending.name,
      passwordHash: pending.passwordHash,
    });

    await db.delete(pendingRegistrations).where(eq(pendingRegistrations.email, email));

    const session = c.get("session");
    session.set("user", {
      email: pending.email,
      name: pending.name,
    });

    return c.redirect("/");
  } catch (error) {
    console.error("Verification error:", error);
    const body = await c.req.parseBody().catch(() => ({}));
    const email = (body as Record<string, string>).email || "";
    return c.html(
      `<!DOCTYPE html>${await VerifyEmailPage({ email, error: "Verification failed. Please try again." })}`,
      500,
    );
  }
});

emailAuth.post("/auth/resend-code", async (c) => {
  try {
    const body = await c.req.parseBody();
    const email = body.email as string;

    if (!email) {
      return c.redirect("/auth/register");
    }

    const db = getDb(c.env.DB);
    const [pending] = await db
      .select()
      .from(pendingRegistrations)
      .where(eq(pendingRegistrations.email, email))
      .limit(1);

    if (!pending) {
      return c.html(
        `<!DOCTYPE html>${await VerifyEmailPage({ email, error: "No pending registration found. Please register again." })}`,
        400,
      );
    }

    const verificationCode = generateVerificationCode();
    const expiresAt = createExpiresAt();

    await db
      .update(pendingRegistrations)
      .set({ verificationCode, expiresAt })
      .where(eq(pendingRegistrations.email, email));

    if (c.env.NODE_ENV === "development") {
      console.log(`[DEV] Verification code for ${email}: ${verificationCode}`);
    } else {
      const emailResult = await sendVerificationEmail(
        c.env.RESEND_API_KEY,
        c.env.RESEND_FROM_EMAIL,
        email,
        verificationCode,
      );
      if (!emailResult.success) {
        return c.html(
          `<!DOCTYPE html>${await VerifyEmailPage({ email, error: "Failed to resend verification email. Please try again." })}`,
          500,
        );
      }
    }

    return c.html(
      `<!DOCTYPE html>${await VerifyEmailPage({ email, success: "A new verification code has been sent." })}`,
    );
  } catch (error) {
    console.error("Resend code error:", error);
    const body = await c.req.parseBody().catch(() => ({}));
    const email = (body as Record<string, string>).email || "";
    return c.html(
      `<!DOCTYPE html>${await VerifyEmailPage({ email, error: "Failed to resend code. Please try again." })}`,
      500,
    );
  }
});

export { emailAuth };
