import { describe, expect, it, vi } from "vitest";
import { createTestApp } from "../testApp.js";

// Mock the database module
vi.mock("../db/index.js", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
  users: {},
}));

// Mock the password module
vi.mock("../auth/password.js", () => ({
  hashPassword: vi.fn().mockResolvedValue("salt:hash"),
  verifyPassword: vi.fn().mockResolvedValue(false),
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
  });
});
