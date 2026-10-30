import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "../auth/password.js";
import { createTestApp } from "../testApp.js";

const { mockSendVerificationEmail } = vi.hoisted(() => ({
  mockSendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("../auth/emailVerification.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../auth/emailVerification.js")>()),
  generateVerificationCode: () => "123456",
  sendVerificationEmail: mockSendVerificationEmail,
}));

vi.mock("../auth/rateLimiter.js", () => ({
  createRateLimiter: () => {
    const passthrough: import("hono").MiddlewareHandler = async (_c, next) => next();
    return passthrough;
  },
}));

type TestApp = ReturnType<typeof createTestApp>["app"];

beforeEach(() => {
  mockSendVerificationEmail.mockClear();
});

function postForm(app: TestApp, path: string, fields: Record<string, string>, origin = "http://localhost") {
  const body = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    body.append(name, value);
  }
  return app.request(path, { method: "POST", body, headers: { Origin: origin } });
}

async function insertPendingRegistration(db: D1Database, options: { code?: string; expiresAt?: string } = {}) {
  await db
    .prepare(
      `INSERT INTO pending_registrations (email, name, password_hash, verification_code, expires_at)
       VALUES ('new@example.com', 'New User', 'salt:hash', ?, ?)`,
    )
    .bind(options.code ?? "123456", options.expiresAt ?? "2099-01-01T00:00:00.000Z")
    .run();
}

function findPendingRegistration(db: D1Database) {
  return db
    .prepare(
      "SELECT name, verification_code AS verificationCode, password_hash AS passwordHash FROM pending_registrations WHERE email = 'new@example.com'",
    )
    .first<{ name: string; verificationCode: string; passwordHash: string }>();
}

describe("Email Auth routes", () => {
  describe("GET /auth/login", () => {
    it("should return the login page", async () => {
      const { app } = createTestApp();

      const response = await app.request("/auth/login");

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("Login to Mlack");
      expect(html).toContain('action="/auth/login"');
      expect(html).toContain('name="email"');
      expect(html).toContain('name="password"');
      expect(html).not.toContain("/auth/google");
    });
  });

  describe("GET /auth/register", () => {
    it("should return the registration page", async () => {
      const { app } = createTestApp();

      const response = await app.request("/auth/register");

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("Create an Account");
      expect(html).toContain('action="/auth/register"');
      expect(html).toContain('name="name"');
      expect(html).toContain('name="email"');
      expect(html).toContain('name="password"');
      expect(html).not.toContain("/auth/google");
    });
  });

  describe("POST /auth/login", () => {
    async function createAppWithUser() {
      const testApp = createTestApp();
      await testApp.db
        .prepare("INSERT INTO users (email, name, password_hash) VALUES ('user@example.com', 'Test User', ?)")
        .bind(await hashPassword("correct-password"))
        .run();
      return testApp.app;
    }

    it("should return 403 for cross-origin form submissions", async () => {
      const { app } = createTestApp();

      const response = await postForm(
        app,
        "/auth/login",
        { email: "user@example.com", password: "correct-password" },
        "http://evil.example.com",
      );

      expect(response.status).toBe(403);
    });

    it("should return 400 when email or password is missing", async () => {
      const { app } = createTestApp();

      const response = await postForm(app, "/auth/login", { email: "user@example.com" });

      expect(response.status).toBe(400);
      expect(await response.text()).toContain("Email and password are required.");
    });

    it("should return 401 when user is not found", async () => {
      const { app } = createTestApp();

      const response = await postForm(app, "/auth/login", { email: "unknown@example.com", password: "whatever1" });

      expect(response.status).toBe(401);
      expect(await response.text()).toContain("Invalid email or password.");
    });

    it("should return 401 when password is incorrect", async () => {
      const app = await createAppWithUser();

      const response = await postForm(app, "/auth/login", { email: "user@example.com", password: "wrong-password" });

      expect(response.status).toBe(401);
      expect(await response.text()).toContain("Invalid email or password.");
    });

    it("should start a session and redirect to / on successful login", async () => {
      const app = await createAppWithUser();

      const response = await postForm(app, "/auth/login", {
        email: " User@Example.com ",
        password: "correct-password",
      });

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/");
      expect(response.headers.get("Set-Cookie")).toMatch(/^session=[^;]+;/);
    });
  });

  describe("POST /auth/register", () => {
    const newUser = { name: "New User", email: "new@example.com", password: "password123" };

    it("should return 403 for cross-origin form submissions", async () => {
      const { app } = createTestApp();

      const response = await postForm(app, "/auth/register", newUser, "http://evil.example.com");

      expect(response.status).toBe(403);
    });

    it("should return 400 when fields are missing", async () => {
      const { app } = createTestApp();

      const response = await postForm(app, "/auth/register", { email: "new@example.com" });

      expect(response.status).toBe(400);
      expect(await response.text()).toContain("All fields are required.");
    });

    it("should return 400 when password is too short", async () => {
      const { app } = createTestApp();

      const response = await postForm(app, "/auth/register", { ...newUser, password: "short" });

      expect(response.status).toBe(400);
      expect(await response.text()).toContain("Password must be at least 8 characters.");
    });

    it("should return 409 when email already exists in users table", async () => {
      const { app, db } = createTestApp();
      await db.exec(
        "INSERT INTO users (email, name, password_hash) VALUES ('new@example.com', 'Existing User', 'salt:hash')",
      );

      const response = await postForm(app, "/auth/register", newUser);

      expect(response.status).toBe(409);
      expect(await response.text()).toContain("An account with this email already exists.");
    });

    it("should store a pending registration, send the code and redirect to verify-email", async () => {
      const { app, db } = createTestApp();

      const response = await postForm(app, "/auth/register", newUser);

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/verify-email?email=new%40example.com");
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        "re_test_key",
        "noreply@test.com",
        "new@example.com",
        "123456",
      );
      const pending = await findPendingRegistration(db);
      expect(pending).toMatchObject({ name: "New User", verificationCode: "123456" });
      expect(pending?.passwordHash).not.toContain("password123");
    });

    it("should replace an existing pending registration for the same email", async () => {
      const { app, db } = createTestApp();
      await insertPendingRegistration(db, { code: "000000" });

      const response = await postForm(app, "/auth/register", { ...newUser, name: "New Name" });

      expect(response.status).toBe(302);
      expect(await findPendingRegistration(db)).toMatchObject({ name: "New Name", verificationCode: "123456" });
    });

    it("should return 500 when email sending fails", async () => {
      mockSendVerificationEmail.mockResolvedValueOnce({ success: false, error: "API error" });
      const { app } = createTestApp();

      const response = await postForm(app, "/auth/register", newUser);

      expect(response.status).toBe(500);
      expect(await response.text()).toContain("Failed to send verification email. Please try again.");
    });
  });

  describe("GET /auth/verify-email", () => {
    it("should redirect to register when email is missing", async () => {
      const { app } = createTestApp();

      const response = await app.request("/auth/verify-email");

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/register");
    });

    it("should return the verify email page", async () => {
      const { app } = createTestApp();

      const response = await app.request("/auth/verify-email?email=test%40example.com");

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("Verify Your Email");
      expect(html).toContain("test@example.com");
    });
  });

  describe("POST /auth/verify-email", () => {
    it("should return 403 for cross-origin form submissions", async () => {
      const { app } = createTestApp();

      const response = await postForm(
        app,
        "/auth/verify-email",
        { email: "new@example.com", code: "123456" },
        "http://evil.example.com",
      );

      expect(response.status).toBe(403);
    });

    it("should return 400 when email or code is missing", async () => {
      const { app } = createTestApp();

      const response = await postForm(app, "/auth/verify-email", { email: "new@example.com" });

      expect(response.status).toBe(400);
      expect(await response.text()).toContain("Email and code are required.");
    });

    it("should return 400 when no pending registration found", async () => {
      const { app } = createTestApp();

      const response = await postForm(app, "/auth/verify-email", { email: "unknown@example.com", code: "123456" });

      expect(response.status).toBe(400);
      expect(await response.text()).toContain("No pending registration found. Please register again.");
    });

    it("should delete an expired pending registration", async () => {
      const { app, db } = createTestApp();
      await insertPendingRegistration(db, { expiresAt: "2020-01-01T00:00:00.000Z" });

      const response = await postForm(app, "/auth/verify-email", { email: "new@example.com", code: "123456" });

      expect(response.status).toBe(400);
      expect(await response.text()).toContain("Verification code has expired. Please register again.");
      expect(await findPendingRegistration(db)).toBeNull();
    });

    it("should return 400 when verification code is incorrect", async () => {
      const { app, db } = createTestApp();
      await insertPendingRegistration(db, { code: "654321" });

      const response = await postForm(app, "/auth/verify-email", { email: "new@example.com", code: "000000" });

      expect(response.status).toBe(400);
      expect(await response.text()).toContain("Invalid verification code.");
    });

    it("should create the user, start a session and redirect to / on success", async () => {
      const { app, db } = createTestApp();
      await insertPendingRegistration(db);

      const response = await postForm(app, "/auth/verify-email", { email: "new@example.com", code: "123456" });

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/");
      expect(response.headers.get("Set-Cookie")).toMatch(/^session=[^;]+;/);
      expect(await db.prepare("SELECT email, name, password_hash AS passwordHash FROM users").first()).toEqual({
        email: "new@example.com",
        name: "New User",
        passwordHash: "salt:hash",
      });
      expect(await findPendingRegistration(db)).toBeNull();
    });
  });

  describe("POST /auth/resend-code", () => {
    it("should return 403 for cross-origin form submissions", async () => {
      const { app } = createTestApp();

      const response = await postForm(
        app,
        "/auth/resend-code",
        { email: "new@example.com" },
        "http://evil.example.com",
      );

      expect(response.status).toBe(403);
    });

    it("should redirect to register when email is missing", async () => {
      const { app } = createTestApp();

      const response = await postForm(app, "/auth/resend-code", {});

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/register");
    });

    it("should return 400 when no pending registration found", async () => {
      const { app } = createTestApp();

      const response = await postForm(app, "/auth/resend-code", { email: "unknown@example.com" });

      expect(response.status).toBe(400);
      expect(await response.text()).toContain("No pending registration found. Please register again.");
    });

    it("should store and send a new verification code", async () => {
      const { app, db } = createTestApp();
      await insertPendingRegistration(db, { code: "000000" });

      const response = await postForm(app, "/auth/resend-code", { email: "new@example.com" });

      expect(response.status).toBe(200);
      expect(await response.text()).toContain("A new verification code has been sent.");
      expect(await findPendingRegistration(db)).toMatchObject({ verificationCode: "123456" });
      expect(mockSendVerificationEmail).toHaveBeenCalledWith(
        "re_test_key",
        "noreply@test.com",
        "new@example.com",
        "123456",
      );
    });

    it("should return 500 when email sending fails on resend", async () => {
      mockSendVerificationEmail.mockResolvedValueOnce({ success: false, error: "API error" });
      const { app, db } = createTestApp();
      await insertPendingRegistration(db);

      const response = await postForm(app, "/auth/resend-code", { email: "new@example.com" });

      expect(response.status).toBe(500);
      expect(await response.text()).toContain("Failed to resend verification email. Please try again.");
    });
  });
});
