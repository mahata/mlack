export async function ChatPage() {
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
        >
          <h1>Hello, world!</h1>
          <div id="status" className="status disconnected">
            Connecting...
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
