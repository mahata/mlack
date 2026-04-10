import { describe, expect, it } from "vitest";
import { WorkspacesPage } from "./WorkspacesPage.js";

const mockUser = { email: "test@example.com", name: "Test User", picture: "https://example.com/pic.jpg" };

describe("WorkspacesPage component", () => {
  it("should include CSS stylesheet", async () => {
    const jsxElement = await WorkspacesPage(mockUser, []);
    const html = jsxElement.toString();

    expect(html).toContain('href="/components/WorkspacesPage.css"');
  });

  it("should include client-side script", async () => {
    const jsxElement = await WorkspacesPage(mockUser, []);
    const html = jsxElement.toString();

    expect(html).toContain('src="/static/WorkspacesPage.js"');
  });

  it("should render the Create Workspace button", async () => {
    const jsxElement = await WorkspacesPage(mockUser, []);
    const html = jsxElement.toString();

    expect(html).toContain('id="createWorkspaceButton"');
    expect(html).toContain("+ Create Workspace");
  });

  it("should render the create workspace modal (hidden)", async () => {
    const jsxElement = await WorkspacesPage(mockUser, []);
    const html = jsxElement.toString();

    expect(html).toContain('id="createWorkspaceModal"');
    expect(html).toContain("modal hidden");
    expect(html).toContain('id="workspaceName"');
    expect(html).toContain('id="workspaceSlug"');
    expect(html).toContain('id="confirmCreateWorkspace"');
    expect(html).toContain('id="cancelCreateWorkspace"');
  });

  it("should render empty state when no workspaces", async () => {
    const jsxElement = await WorkspacesPage(mockUser, []);
    const html = jsxElement.toString();

    expect(html).toContain("You are not a member of any workspaces yet");
    expect(html).toContain("Create a new workspace or ask someone for an invite link");
  });

  it("should render workspace list when workspaces exist", async () => {
    const workspaces = [
      {
        id: 1,
        name: "Default",
        slug: "default",
        createdByEmail: "admin@test.com",
        createdAt: "2025-01-01",
        role: "admin",
      },
      { id: 2, name: "Team", slug: "team", createdByEmail: "admin@test.com", createdAt: "2025-01-01", role: "member" },
    ];
    const jsxElement = await WorkspacesPage(mockUser, workspaces);
    const html = jsxElement.toString();

    expect(html).toContain("Default");
    expect(html).toContain("/default");
    expect(html).toContain("Team");
    expect(html).toContain("/team");
  });

  it("should show admin badge for admin workspaces", async () => {
    const workspaces = [
      {
        id: 1,
        name: "Default",
        slug: "default",
        createdByEmail: "admin@test.com",
        createdAt: "2025-01-01",
        role: "admin",
      },
    ];
    const jsxElement = await WorkspacesPage(mockUser, workspaces);
    const html = jsxElement.toString();

    expect(html).toContain("Admin");
    expect(html).toContain("workspace-badge admin");
  });

  it("should not show admin badge for member workspaces", async () => {
    const workspaces = [
      { id: 2, name: "Team", slug: "team", createdByEmail: "admin@test.com", createdAt: "2025-01-01", role: "member" },
    ];
    const jsxElement = await WorkspacesPage(mockUser, workspaces);
    const html = jsxElement.toString();

    expect(html).not.toContain("workspace-badge admin");
  });

  it("should display user email and profile picture", async () => {
    const jsxElement = await WorkspacesPage(mockUser, []);
    const html = jsxElement.toString();

    expect(html).toContain("test@example.com");
    expect(html).toContain("https://example.com/pic.jpg");
  });

  it("should include slug preview area in modal", async () => {
    const jsxElement = await WorkspacesPage(mockUser, []);
    const html = jsxElement.toString();

    expect(html).toContain("slug-preview");
    expect(html).toContain('id="slugPreviewValue"');
  });

  it("should include error message area in modal", async () => {
    const jsxElement = await WorkspacesPage(mockUser, []);
    const html = jsxElement.toString();

    expect(html).toContain('id="createWorkspaceError"');
  });
});
