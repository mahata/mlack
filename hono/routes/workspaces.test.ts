import { describe, expect, it, vi } from "vitest";
import { createTestApp } from "../testApp.js";

const mockSelect = vi.fn();
const mockInsert = vi.fn();

vi.mock("../db/index.js", () => ({
  getDb: () => ({
    select: (...args: unknown[]) => mockSelect(...args),
    insert: (...args: unknown[]) => mockInsert(...args),
  }),
  workspaces: { id: "id", name: "name", slug: "slug", createdByEmail: "created_by_email", createdAt: "created_at" },
  workspaceMembers: {
    id: "id",
    workspaceId: "workspace_id",
    userEmail: "user_email",
    role: "role",
    joinedAt: "joined_at",
  },
}));

const authenticatedUser = { email: "test@example.com", name: "Test User", picture: "test.jpg" };
const CSRF_HEADERS = { Origin: "http://localhost" };

describe("POST /api/workspaces", () => {
  it("should create a workspace and return 201", async () => {
    const createdWorkspace = {
      id: 2,
      name: "New Workspace",
      slug: "new-workspace",
      createdByEmail: "test@example.com",
      createdAt: "2025-01-01",
    };

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    mockInsert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([createdWorkspace]),
      }),
    });

    mockInsert.mockReturnValueOnce({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const { app } = createTestApp({ authenticatedUser });
    const response = await app.request("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...CSRF_HEADERS },
      body: JSON.stringify({ name: "New Workspace", slug: "new-workspace" }),
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as { workspace: { name: string; slug: string } };
    expect(body.workspace.name).toBe("New Workspace");
    expect(body.workspace.slug).toBe("new-workspace");
  });

  it("should return 400 when name is missing", async () => {
    const { app } = createTestApp({ authenticatedUser });
    const response = await app.request("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...CSRF_HEADERS },
      body: JSON.stringify({ slug: "some-slug" }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("name is required");
  });

  it("should return 400 when slug is invalid", async () => {
    const { app } = createTestApp({ authenticatedUser });
    const response = await app.request("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...CSRF_HEADERS },
      body: JSON.stringify({ name: "Test", slug: "-bad-slug-" }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("Slug must be");
  });

  it("should return 400 when slug is too short", async () => {
    const { app } = createTestApp({ authenticatedUser });
    const response = await app.request("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...CSRF_HEADERS },
      body: JSON.stringify({ name: "Test", slug: "ab" }),
    });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("Slug must be");
  });

  it("should return 409 when slug already exists", async () => {
    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: 1, name: "Existing", slug: "taken" }]),
      }),
    });

    const { app } = createTestApp({ authenticatedUser });
    const response = await app.request("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...CSRF_HEADERS },
      body: JSON.stringify({ name: "Another", slug: "taken" }),
    });

    expect(response.status).toBe(409);
    const body = (await response.json()) as { error: string };
    expect(body.error).toContain("already exists");
  });

  it("should allow non-admin users to create workspaces", async () => {
    const createdWorkspace = {
      id: 3,
      name: "My First Workspace",
      slug: "my-first",
      createdByEmail: "newuser@example.com",
      createdAt: "2025-01-01",
    };

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    mockInsert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([createdWorkspace]),
      }),
    });

    mockInsert.mockReturnValueOnce({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const newUser = { email: "newuser@example.com", name: "New User", picture: "" };
    const { app } = createTestApp({ authenticatedUser: newUser });
    const response = await app.request("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...CSRF_HEADERS },
      body: JSON.stringify({ name: "My First Workspace", slug: "my-first" }),
    });

    expect(response.status).toBe(201);
    const body = (await response.json()) as { workspace: { name: string } };
    expect(body.workspace.name).toBe("My First Workspace");
  });

  it("should return 401 when user is not authenticated", async () => {
    const { app } = createTestApp({ authenticatedUser: null });
    const response = await app.request("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...CSRF_HEADERS },
      body: JSON.stringify({ name: "Test", slug: "test" }),
    });

    expect(response.status).toBe(401);
  });
});

describe("GET /api/workspaces", () => {
  it("should return workspaces for authenticated user", async () => {
    const userWorkspaces = [
      { id: 1, name: "Default", slug: "default", createdByEmail: "system", createdAt: "2025-01-01", role: "admin" },
    ];

    mockSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(userWorkspaces),
        }),
      }),
    });

    const { app } = createTestApp({ authenticatedUser });
    const response = await app.request("/api/workspaces");

    expect(response.status).toBe(200);
    const body = (await response.json()) as { workspaces: unknown[] };
    expect(body.workspaces).toHaveLength(1);
  });

  it("should return 401 when user is not authenticated", async () => {
    const { app } = createTestApp({ authenticatedUser: null });
    const response = await app.request("/api/workspaces");

    expect(response.status).toBe(401);
  });
});
