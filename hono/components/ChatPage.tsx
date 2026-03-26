import type { User } from "../types.js";

export async function ChatPage(wsUrl?: string, user?: User) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>MLack - Real-time Chat</title>
        <link rel="stylesheet" href="/components/ChatPage.css" />
      </head>
      <body>
        <div className="app-layout" data-ws-url={wsUrl || "ws://localhost:3000/ws"}>
          <aside className="sidebar">
            <div className="sidebar-header">
              <h2>MLack</h2>
            </div>
            <div className="sidebar-channels">
              <div className="sidebar-section-header">
                <span>Channels</span>
                <button type="button" id="createChannelButton" className="create-channel-button" title="Create channel">
                  +
                </button>
              </div>
              <ul id="channelList" className="channel-list"></ul>
            </div>
            <div className="sidebar-section-header">
              <span>Browse</span>
            </div>
            <ul id="browseChannelList" className="channel-list browse-list"></ul>
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

          <main className="chat-main">
            <div className="chat-header">
              <h2 id="channelName">#general</h2>
            </div>
            <div id="status" className="status disconnected">
              Connecting to {wsUrl}...
            </div>
            <div id="messages"></div>
            <div className="input-container">
              <input type="text" id="messageInput" placeholder="Type your message..." disabled />
              <button type="button" id="sendButton" disabled>
                Send
              </button>
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

        <script src="/static/ChatPage.js"></script>
      </body>
    </html>
  );
}
