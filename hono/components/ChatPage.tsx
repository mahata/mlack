import type { User, Workspace } from "../types.js";

export async function ChatPage(wsUrl?: string, user?: User, workspace?: Workspace) {
  const slug = workspace?.slug || "default";
  const workspaceName = workspace?.name || "MLack";

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
        <title>{workspaceName} - MLack</title>
        <link rel="stylesheet" href="/components/ChatPage.css" />
      </head>
      <body>
        <div
          className="app-layout"
          data-ws-url={wsUrl || "ws://localhost:3000/w/default/ws"}
          data-workspace-slug={slug}
        >
          <aside id="sidebar" className="sidebar">
            <div className="sidebar-header">
              <a href="/" className="workspace-back-link" title="All workspaces">
                <h2>{workspaceName}</h2>
              </a>
              <button
                type="button"
                id="createWorkspaceButton"
                className="create-workspace-button"
                title="Create workspace"
                aria-label="Create workspace"
              >
                +
              </button>
            </div>
            <div className="sidebar-channels">
              <div className="sidebar-section-header">
                <span>Channels</span>
                <button
                  type="button"
                  id="createChannelButton"
                  className="create-channel-button"
                  title="Create channel"
                  aria-label="Create channel"
                >
                  +
                </button>
              </div>
              <ul id="channelList" className="channel-list"></ul>
            </div>
            <div className="sidebar-section-header">
              <span>Browse</span>
            </div>
            <ul id="browseChannelList" className="channel-list browse-list"></ul>
            <div className="sidebar-section-header">
              <span>Direct Messages</span>
              <button
                type="button"
                id="dmComposeButton"
                className="create-channel-button"
                title="New direct message"
                aria-label="New direct message"
              >
                +
              </button>
            </div>
            <ul id="dmList" className="channel-list dm-list"></ul>
            <div className="sidebar-user">
              {user?.picture && <img src={user.picture} alt="Profile" className="profile-picture" />}
              <span className="user-email">{user?.email}</span>
              <form method="post" action="/auth/logout" style={{ display: "inline" }}>
                <button type="submit" className="logout-button" title="Logout">
                  Logout
                </button>
              </form>
            </div>
          </aside>

          <div id="sidebarOverlay" className="sidebar-overlay hidden"></div>

          <main className="chat-main">
            <div className="chat-header">
              <h1>Hello, world!</h1>
              <div className="chat-header-row">
                <button
                  type="button"
                  id="sidebarToggle"
                  className="sidebar-toggle"
                  title="Toggle sidebar"
                  aria-label="Toggle sidebar"
                  aria-controls="sidebar"
                  aria-expanded="false"
                >
                  <span className="sidebar-toggle-icon"></span>
                </button>
                <h2 id="channelName">#general</h2>
                <button
                  type="button"
                  id="toggleMembersButton"
                  className="toggle-members-button"
                  title="Toggle members panel"
                  aria-controls="membersPanel"
                  aria-expanded="true"
                >
                  Members
                </button>
              </div>
            </div>
            <div id="status" className="status disconnected">
              Connecting to {wsUrl}...
            </div>
            <div className="chat-content">
              <div className="chat-messages-area">
                <div id="messages"></div>
                <div className="input-container">
                  <input
                    type="file"
                    id="fileInput"
                    accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    id="attachButton"
                    className="attach-button"
                    title="Attach image or video"
                    disabled
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      role="img"
                      aria-label="Attach file"
                    >
                      <title>Attach file</title>
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                    </svg>
                  </button>
                  <input type="text" id="messageInput" placeholder="Type your message..." disabled />
                  <button type="button" id="sendButton" disabled>
                    Send
                  </button>
                </div>
                <div id="attachmentPreview" className="attachment-preview hidden"></div>
              </div>
              <aside id="membersPanel" className="members-panel">
                <div className="members-panel-header">
                  <h3>Members</h3>
                </div>
                <ul id="membersList" className="members-list"></ul>
              </aside>
            </div>
          </main>
        </div>

        <div id="createChannelModal" className="modal hidden">
          <div className="modal-content">
            <h3>Create Channel</h3>
            <input type="text" id="newChannelName" placeholder="channel-name" />
            <div className="modal-actions">
              <button type="button" id="cancelCreateChannel">
                Cancel
              </button>
              <button type="button" id="confirmCreateChannel">
                Create
              </button>
            </div>
          </div>
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
            <p className="slug-preview">
              Your workspace URL will be:{" "}
              <span className="slug-preview-value" id="slugPreviewValue">
                ...
              </span>
            </p>
            <p id="createWorkspaceError" className="modal-error hidden"></p>
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

        <div
          id="dmComposeModal"
          className="modal hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dmComposeTitle"
        >
          <div className="modal-content">
            <h3 id="dmComposeTitle">New Direct Message</h3>
            <input type="text" id="dmSearchInput" placeholder="Search members..." />
            <ul id="dmMemberList" className="dm-member-list"></ul>
          </div>
        </div>

        <script src="/static/ChatPage.js"></script>
      </body>
    </html>
  );
}
