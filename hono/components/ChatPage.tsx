interface User {
  email?: string;
  name?: string;
  picture?: string;
}

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
        <div
          className="chat-container"
          data-status-class="status"
          data-connected-class="connected"
          data-disconnected-class="disconnected"
          data-message-class="message"
          data-ws-url={wsUrl || "ws://localhost:3000/ws"}
        >
          {user && (
            <div className="user-info">
              {user.picture && <img src={user.picture} alt="Profile" className="profile-picture" />}
              <span className="user-email">{user.email}</span>
              <form method="post" action="/auth/logout" style={{ display: "inline" }}>
                <button type="submit" className="logout-button">
                  Logout
                </button>
              </form>
            </div>
          )}
          <h1 className="page-title">Hello, world!</h1>
          <div id="status" className="status disconnected">
            {}
            Connecting to {wsUrl}...
          </div>
          <div id="messages"></div>
          <div className="input-container">
            <input type="text" id="messageInput" placeholder="Type your message..." disabled />
            <button type="button" id="sendButton" disabled>
              Send
            </button>
          </div>
        </div>

        <script src="/static/ChatPage.js"></script>
      </body>
    </html>
  );
}
