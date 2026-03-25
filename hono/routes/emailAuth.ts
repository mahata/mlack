import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { LoginPage } from "../components/LoginPage.js";
import { RegisterPage } from "../components/RegisterPage.js";
import { db, users } from "../db/index.js";
import type { Variables } from "../types.js";

const emailAuth = new Hono<{ Variables: Variables }>();

// Show login page
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

// Handle login form submission
emailAuth.post("/auth/login", async (c) => {
  try {
    const body = await c.req.parseBody();
    const email = body.email as string;
    const password = body.password as string;

    if (!email || !password) {
      return c.html(`<!DOCTYPE html>${await LoginPage("Email and password are required.")}`, 400);
    }

    // Look up the user by email
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (!user) {
      return c.html(`<!DOCTYPE html>${await LoginPage("Invalid email or password.")}`, 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return c.html(`<!DOCTYPE html>${await LoginPage("Invalid email or password.")}`, 401);
    }

    // Set session
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

// Show registration page
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

// Handle registration form submission
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

    // Check if user already exists
    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return c.html(`<!DOCTYPE html>${await RegisterPage("An account with this email already exists.")}`, 409);
    }

    // Hash password and create user
    const passwordHash = await hashPassword(password);
    await db.insert(users).values({
      email,
      name,
      passwordHash,
    });

    // Set session and redirect to chat
    const session = c.get("session");
    session.set("user", {
      email,
      name,
    });

    return c.redirect("/");
  } catch (error) {
    console.error("Registration error:", error);
    return c.html(`<!DOCTYPE html>${await RegisterPage("Registration failed. Please try again.")}`, 500);
  }
});

export { emailAuth };
