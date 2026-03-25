import { describe, expect, it, vi } from "vitest";
import { createTestApp } from "../testApp.js";

const { mockLimit, mockVerifyPassword, mockInsertValues } = vi.hoisted(() => ({
  mockLimit: vi.fn().mockResolvedValue([]),
  mockVerifyPassword: vi.fn().mockResolvedValue(false),
  mockInsertValues: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../db/index.js", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: mockLimit,
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: mockInsertValues,
    }),
  },
  users: {},
}));

vi.mock("../auth/password.js", () => ({
  hashPassword: vi.fn().mockResolvedValue("salt:hash"),
  verifyPassword: mockVerifyPassword,
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
      // password missing

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
      mockLimit.mockResolvedValueOnce([{ email: "user@example.com", name: "Test User", passwordHash: "salt:hash" }]);
      mockVerifyPassword.mockResolvedValueOnce(false);
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "user@example.com");
      formData.append("password", "wrongpassword");

      const response = await app.request("/auth/login", {
        method: "POST",
        body: formData,
      });

      expect(response.status).toBe(401);
      const html = await response.text();
      expect(html).toContain("Invalid email or password.");
    });

    it("should redirect to / on successful login", async () => {
      mockLimit.mockResolvedValueOnce([{ email: "user@example.com", name: "Test User", passwordHash: "salt:hash" }]);
      mockVerifyPassword.mockResolvedValueOnce(true);
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("email", "user@example.com");
      formData.append("password", "correctpassword");

      const response = await app.request("/auth/login", {
        method: "POST",
        body: formData,
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
      // name and password missing

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

    it("should return 409 when email already exists", async () => {
      mockLimit.mockResolvedValueOnce([{ email: "existing@example.com", name: "Existing User", passwordHash: "salt:hash" }]);
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("name", "New User");
      formData.append("email", "existing@example.com");
      formData.append("password", "password123");

      const response = await app.request("/auth/register", {
        method: "POST",
        body: formData,
      });

      expect(response.status).toBe(409);
      const html = await response.text();
      expect(html).toContain("An account with this email already exists.");
    });

    it("should redirect to / on successful registration", async () => {
      const { app } = createTestApp({ authenticatedUser: null });

      const formData = new FormData();
      formData.append("name", "New User");
      formData.append("email", "new@example.com");
      formData.append("password", "password123");

      const response = await app.request("/auth/register", {
        method: "POST",
        body: formData,
      });

      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/");
      expect(mockInsertValues).toHaveBeenCalledOnce();
    });
  });
});
