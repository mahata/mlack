import type { Workspace } from "../types.js";
import { Layout } from "./Layout.js";

type InvitePageProps = {
  workspace?: Workspace;
  code?: string;
  error?: string;
};

export async function InvitePage({ workspace, code, error }: InvitePageProps) {
  const pageTitle = error ? "Invite Error" : `Join ${workspace?.name}`;

  return (
    <Layout title={pageTitle} css="/components/WorkspacesPage.css">
      <div className="workspaces-container">
        <div className="workspaces-header">
          <h1>Mlack</h1>
        </div>

        {error ? (
          <div className="empty-state">
            <p>{error}</p>
            <a href="/">Back to workspaces</a>
          </div>
        ) : (
          <div className="empty-state">
            <p>
              You've been invited to join <strong>{workspace?.name}</strong>.
            </p>
            <form method="post" action={`/w/${workspace?.slug}/invite/${code}`}>
              <button type="submit" className="logout-button" style={{ fontSize: "1rem", padding: "0.5rem 1.5rem" }}>
                Accept Invite
              </button>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
