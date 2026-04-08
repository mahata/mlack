import type { User, Workspace } from "../types.js";

type WorkspaceWithRole = Workspace & { role: string };

export async function WorkspacesPage(user: User, workspaceList: WorkspaceWithRole[]) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Workspaces - MLack</title>
        <link rel="stylesheet" href="/components/WorkspacesPage.css" />
      </head>
      <body>
        <div className="workspaces-container">
          <div className="workspaces-header">
            <h1>MLack Workspaces</h1>
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

        <div
          id="createWorkspaceModal"
          className="modal hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="createWorkspaceTitle"
        >
          <div className="modal-content">
            <h3 id="createWorkspaceTitle">Create Workspace</h3>
            <label className="modal-label" htmlFor="workspaceName">
              Name
            </label>
            <input type="text" id="workspaceName" placeholder="My Workspace" />
            <label className="modal-label" htmlFor="workspaceSlug">
              Slug
            </label>
            <input type="text" id="workspaceSlug" placeholder="my-workspace" />
            <p className="slug-preview" id="slugPreview">
              URL: /w/<span id="slugPreviewValue">...</span>
            </p>
            <p className="modal-error hidden" id="createWorkspaceError" />
            <div className="modal-actions">
              <button type="button" id="cancelCreateWorkspace">
                Cancel
              </button>
              <button type="button" id="confirmCreateWorkspace">
                Create
              </button>
            </div>
          </div>
        </div>

        <script src="/static/WorkspacesPage.js"></script>
      </body>
    </html>
  );
}
