import type { User, Workspace } from "../types.js";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal.js";

type WorkspaceWithRole = Workspace & { role: string };

export async function WorkspacesPage(user: User, workspaceList: WorkspaceWithRole[]) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Workspaces - Mlack</title>
        <link rel="stylesheet" href="/components/WorkspacesPage.css" />
      </head>
      <body>
        <div className="workspaces-container">
          <div className="workspaces-header">
            <h1>Mlack Workspaces</h1>
            <div className="user-info">
              {user.picture && <img src={user.picture} alt="Profile" className="profile-picture" />}
              <span className="user-email">{user.email}</span>
              <form method="post" action="/auth/logout" style={{ display: "inline" }}>
                <button type="submit" className="logout-button" title="Logout">
                  Logout
                </button>
              </form>
            </div>
          </div>

          <button type="button" id="createWorkspaceButton" className="create-workspace-button">
            + Create Workspace
          </button>

          {workspaceList.length === 0 ? (
            <div className="empty-state">
              <p>You are not a member of any workspaces yet.</p>
              <p>Create a new workspace or ask someone for an invite link.</p>
            </div>
          ) : (
            <ul className="workspace-list">
              {workspaceList.map((w) => (
                <li className="workspace-item">
                  <a href={`/w/${w.slug}`} className="workspace-link">
                    <span className="workspace-name">{w.name}</span>
                    <span className="workspace-slug">/{w.slug}</span>
                    {w.role === "admin" && <span className="workspace-badge admin">Admin</span>}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {await CreateWorkspaceModal()}

        <script src="/static/workspaceModal.js"></script>
        <script src="/static/WorkspacesPage.js"></script>
      </body>
    </html>
  );
}
