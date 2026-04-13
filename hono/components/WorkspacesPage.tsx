import type { User, Workspace } from "../types.js";
import { CreateWorkspaceModal } from "./CreateWorkspaceModal.js";
import { Layout } from "./Layout.js";

type WorkspaceWithRole = Workspace & { role: string };

export async function WorkspacesPage(user: User, workspaceList: WorkspaceWithRole[]) {
  return (
    <Layout
      title="Workspaces"
      css="/components/WorkspacesPage.css"
      scripts={["/static/workspaceModal.js", "/static/WorkspacesPage.js"]}
    >
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
    </Layout>
  );
}
