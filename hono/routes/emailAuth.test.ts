import { describe, expect, it, vi } from "vitest";
import { createTestApp } from "../testApp.js";

const {
  mockUsersSelectLimit,
  mockPendingSelectLimit,
  mockDeleteWhere,
  mockUpdateSetWhere,
  mockInsertValues,
  mockVerifyPassword,
  mockSendVerificationEmail,
  mockGenerateVerificationCode,
  mockIsExpired,
} = vi.hoisted(() => ({
  mockUsersSelectLimit: vi.fn().mockResolvedValue([]),
  mockPendingSelectLimit: vi.fn().mockResolvedValue([]),
  mockDeleteWhere: vi.fn().mockResolvedValue(undefined),
  mockUpdateSetWhere: vi.fn().mockResolvedValue(undefined),
  mockInsertValues: vi.fn().mockResolvedValue(undefined),
  mockVerifyPassword: vi.fn().mockResolvedValue(false),
  mockSendVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
  mockGenerateVerificationCode: vi.fn().mockReturnValue("123456"),
  mockIsExpired: vi.fn().mockReturnValue(false),
}));

vi.mock("../db/index.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../db/index.js")>();
  return {
    ...original,
    getDb: () => ({
      select: vi.fn().mockReturnValue({
        from: vi.fn((table: unknown) => ({
          where: vi.fn().mockReturnValue({
            limit: table === original.pendingRegistrations ? mockPendingSelectLimit : mockUsersSelectLimit,
          }),
        })),
      }),
      insert: vi.fn().mockReturnValue({
        values: mockInsertValues,
      }),
      delete: vi.fn().mockReturnValue({
        where: mockDeleteWhere,
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: mockUpdateSetWhere,
        }),
      }),
    }),
  };
});

vi.mock("../auth/password.js", () => ({
  hashPassword: vi.fn().mockResolvedValue("salt:hash"),
  verifyPassword: mockVerifyPassword,
}));

vi.mock("../auth/emailVerification.js", () => ({
  generateVerificationCode: mockGenerateVerificationCode,
  createExpiresAt: vi.fn().mockReturnValue("2099-01-01T00:00:00.000Z"),
  isExpired: mockIsExpired,
  sendVerificationEmail: mockSendVerificationEmail,
}));

describe("Email Auth routes", () => {
  describe("GET /auth/login", () => {
    it("should return the login page", async () => {
      const { app } = createTestApp({ authenticatedUser: null });

      const response = await app.request("/auth/login");
      expect(response.status).toBe(200);

      const html = await response.text();
      expect(html).toContain("Login to MLack");
      expect(html).toContain('action="/auth/login"');
      expect(html).toContain('name="email"');
      expect(html).toContain('name="password"');
    });

    it("should show error message for invalid_credentials", async () => {
      const { app } = createTestApp({ authenticatedUser: null });

      const response = await app.request("/auth/login?error=invalid_credentials");
      const html = await response.text();
      expect(html).toContain("Invalid email or password.");
    });
  });

  describe("GET /auth/register", () => {
    it("should return the registration page", async () => {
      const { app } = createTestApp({ authenticatedUser: null });

      const response = await app.request("/auth/register");
      expect(response.status).toBe(200);

      const html = await response.text();
      expect(html).toContain("Create an Account");
      expect(html).toContain('action="/auth/register"');
      expect(html).toContain('name="name"');
      expect(html).toContain('name="email"');
      expect(html).toContain('name="password"');
    });

    it("should show error message for email_exists", async () => {
      const { app } = createTestApp({ authenticatedUser: null });

      const response = await app.request("/auth/register?error=email_exists");
      const html = await response.text();
      expect(html).toContain("An account with this email already exists.");
    });
  });

  describe("POST /auth/login", () => {
    it("should return 403 for cross-origin form submissions", async () => {
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("password", "somepassword");

      const response = await app.request("/auth/login", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://evil.example.com" },
      });

      expect(response.status).toBe(403);
    });

    it("should return 400 when email or password is missing", async () => {
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "test@example.com");

      const response = await app.request("/auth/login", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(400);
      const html = await response.text();
      expect(html).toContain("Email and password are required.");
    });

    it("should return 401 when user is not found", async () => {
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "unknown@example.com");
      formData.append("password", "somepassword");

      const response = await app.request("/auth/login", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(401);
      const html = await response.text();
      expect(html).toContain("Invalid email or password.");
    });

    it("should return 401 when password is incorrect", async () => {
      mockUsersSelectLimit.mockResolvedValueOnce([
        { email: "user@example.com", name: "Test User", passwordHash: "salt:hash" },
      ]);
      mockVerifyPassword.mockResolvedValueOnce(false);
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "user@example.com");
      formData.append("password", "wrongpassword");

      const response = await app.request("/auth/login", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(401);
      const html = await response.text();
      expect(html).toContain("Invalid email or password.");
    });

    it("should redirect to / on successful login", async () => {
      mockUsersSelectLimit.mockResolvedValueOnce([
        { email: "user@example.com", name: "Test User", passwordHash: "salt:hash" },
      ]);
      mockVerifyPassword.mockResolvedValueOnce(true);
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "user@example.com");
      formData.append("password", "correctpassword");

      const response = await app.request("/auth/login", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/");
    });
  });

  describe("POST /auth/register", () => {
    it("should return 403 for cross-origin form submissions", async () => {
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("name", "Evil User");
      formData.append("email", "evil@example.com");
      formData.append("password", "password123");

      const response = await app.request("/auth/register", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://evil.example.com" },
      });

      expect(response.status).toBe(403);
    });

    it("should return 400 when fields are missing", async () => {
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "test@example.com");

      const response = await app.request("/auth/register", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(400);
      const html = await response.text();
      expect(html).toContain("All fields are required.");
    });

    it("should return 400 when password is too short", async () => {
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("name", "Test User");
      formData.append("email", "test@example.com");
      formData.append("password", "short");

      const response = await app.request("/auth/register", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(400);
      const html = await response.text();
      expect(html).toContain("Password must be at least 8 characters.");
    });

    it("should return 409 when email already exists in users table", async () => {
      mockUsersSelectLimit.mockResolvedValueOnce([
        { email: "existing@example.com", name: "Existing User", passwordHash: "salt:hash" },
      ]);
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("name", "New User");
      formData.append("email", "existing@example.com");
      formData.append("password", "password123");

      const response = await app.request("/auth/register", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(409);
      const html = await response.text();
      expect(html).toContain("An account with this email already exists.");
    });

    it("should redirect to verify-email on successful registration (new pending)", async () => {
      mockUsersSelectLimit.mockResolvedValueOnce([]);
      mockPendingSelectLimit.mockResolvedValueOnce([]);
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("name", "New User");
      formData.append("email", "new@example.com");
      formData.append("password", "password123");

      const response = await app.request("/auth/register", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/verify-email?email=new%40example.com");
      expect(mockInsertValues).toHaveBeenCalled();
      expect(mockSendVerificationEmail).toHaveBeenCalled();
    });

    it("should update existing pending registration instead of inserting", async () => {
      mockUsersSelectLimit.mockResolvedValueOnce([]);
      mockPendingSelectLimit.mockResolvedValueOnce([
        {
          id: 1,
          email: "existing@example.com",
          name: "Old Name",
          passwordHash: "old:hash",
          verificationCode: "000000",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      ]);
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("name", "New Name");
      formData.append("email", "existing@example.com");
      formData.append("password", "password123");

      const response = await app.request("/auth/register", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/verify-email?email=existing%40example.com");
      expect(mockUpdateSetWhere).toHaveBeenCalled();
      expect(mockSendVerificationEmail).toHaveBeenCalled();
    });

    it("should return 500 when email sending fails", async () => {
      mockUsersSelectLimit.mockResolvedValueOnce([]);
      mockPendingSelectLimit.mockResolvedValueOnce([]);
      mockSendVerificationEmail.mockResolvedValueOnce({ success: false, error: "API error" });
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("name", "New User");
      formData.append("email", "new@example.com");
      formData.append("password", "password123");

      const response = await app.request("/auth/register", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(500);
      const html = await response.text();
      expect(html).toContain("Failed to send verification email. Please try again.");
    });
  });

  describe("GET /auth/verify-email", () => {
    it("should redirect to register when email is missing", async () => {
      const { app } = createTestApp({ authenticatedUser: null });

      const response = await app.request("/auth/verify-email");
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/register");
    });

    it("should return the verify email page", async () => {
      const { app } = createTestApp({ authenticatedUser: null });

      const response = await app.request("/auth/verify-email?email=test%40example.com");
      expect(response.status).toBe(200);

      const html = await response.text();
      expect(html).toContain("Verify Your Email");
      expect(html).toContain("test@example.com");
    });
  });

  describe("POST /auth/verify-email", () => {
    it("should return 403 for cross-origin form submissions", async () => {
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("code", "123456");

      const response = await app.request("/auth/verify-email", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://evil.example.com" },
      });

      expect(response.status).toBe(403);
    });

    it("should return 400 when email or code is missing", async () => {
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "test@example.com");

      const response = await app.request("/auth/verify-email", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(400);
      const html = await response.text();
      expect(html).toContain("Email and code are required.");
    });

    it("should return 400 when no pending registration found", async () => {
      mockPendingSelectLimit.mockResolvedValueOnce([]);
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "unknown@example.com");
      formData.append("code", "123456");

      const response = await app.request("/auth/verify-email", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(400);
      const html = await response.text();
      expect(html).toContain("No pending registration found. Please register again.");
    });

    it("should return 400 when verification code has expired", async () => {
      mockPendingSelectLimit.mockResolvedValueOnce([
        {
          id: 1,
          email: "test@example.com",
          name: "Test User",
          passwordHash: "salt:hash",
          verificationCode: "123456",
          expiresAt: "2020-01-01T00:00:00.000Z",
        },
      ]);
      mockIsExpired.mockReturnValueOnce(true);
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("code", "123456");

      const response = await app.request("/auth/verify-email", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(400);
      const html = await response.text();
      expect(html).toContain("Verification code has expired. Please register again.");
      expect(mockDeleteWhere).toHaveBeenCalled();
    });

    it("should return 400 when verification code is incorrect", async () => {
      mockPendingSelectLimit.mockResolvedValueOnce([
        {
          id: 1,
          email: "test@example.com",
          name: "Test User",
          passwordHash: "salt:hash",
          verificationCode: "654321",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      ]);
      mockIsExpired.mockReturnValueOnce(false);
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("code", "000000");

      const response = await app.request("/auth/verify-email", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(400);
      const html = await response.text();
      expect(html).toContain("Invalid verification code.");
    });

    it("should redirect to / on successful verification", async () => {
      mockPendingSelectLimit.mockResolvedValueOnce([
        {
          id: 1,
          email: "test@example.com",
          name: "Test User",
          passwordHash: "salt:hash",
          verificationCode: "123456",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      ]);
      mockIsExpired.mockReturnValueOnce(false);
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "test@example.com");
      formData.append("code", "123456");

      const response = await app.request("/auth/verify-email", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/");
      expect(mockInsertValues).toHaveBeenCalled();
      expect(mockDeleteWhere).toHaveBeenCalled();
    });
  });

  describe("POST /auth/resend-code", () => {
    it("should return 403 for cross-origin form submissions", async () => {
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "test@example.com");

      const response = await app.request("/auth/resend-code", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://evil.example.com" },
      });

      expect(response.status).toBe(403);
    });

    it("should redirect to register when email is missing", async () => {
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();

      const response = await app.request("/auth/resend-code", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/auth/register");
    });

    it("should return 400 when no pending registration found", async () => {
      mockPendingSelectLimit.mockResolvedValueOnce([]);
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "unknown@example.com");

      const response = await app.request("/auth/resend-code", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(400);
      const html = await response.text();
      expect(html).toContain("No pending registration found. Please register again.");
    });

    it("should resend verification code successfully", async () => {
      mockPendingSelectLimit.mockResolvedValueOnce([
        {
          id: 1,
          email: "test@example.com",
          name: "Test User",
          passwordHash: "salt:hash",
          verificationCode: "000000",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      ]);
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "test@example.com");

      const response = await app.request("/auth/resend-code", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(200);
      const html = await response.text();
      expect(html).toContain("A new verification code has been sent.");
      expect(mockUpdateSetWhere).toHaveBeenCalled();
      expect(mockSendVerificationEmail).toHaveBeenCalled();
    });

    it("should return 500 when email sending fails on resend", async () => {
      mockPendingSelectLimit.mockResolvedValueOnce([
        {
          id: 1,
          email: "test@example.com",
          name: "Test User",
          passwordHash: "salt:hash",
          verificationCode: "000000",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      ]);
      mockSendVerificationEmail.mockResolvedValueOnce({ success: false, error: "API error" });
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "test@example.com");

      const response = await app.request("/auth/resend-code", {
        method: "POST",
        body: formData,
        headers: { Origin: "http://localhost" },
      });

      expect(response.status).toBe(500);
      const html = await response.text();
      expect(html).toContain("Failed to resend verification email. Please try again.");
    });
  });
});
