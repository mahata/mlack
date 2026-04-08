import type { Workspace } from "../types.js";

type InvitePageProps = {
  workspace?: Workspace;
  code?: string;
  error?: string;
};

export async function InvitePage({ workspace, code, error }: InvitePageProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{error ? "Invite Error" : `Join ${workspace?.name}`} - MLack</title>
        <link rel="stylesheet" href="/components/WorkspacesPage.css" />
      </head>
      <body>
        <div className="workspaces-container">
          <div className="workspaces-header">
            <h1>MLack</h1>
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
      </body>
    </html>
  );
}
