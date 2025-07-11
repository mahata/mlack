import { text } from "stream/consumers";

export async function ChatPage(wsUrl?: string) {
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
          <h1 className="page-title">Hello, world!</h1>
          <div id="status" className="status disconnected">
            {}
            Connecting to {wsUrl} from <span id="current-url">loading...</span>...
          </div>
          <div id="messages"></div>
          <div className="input-container">
            <input type="text" id="messageInput" placeholder="Type your message..." disabled />
            <button type="button" id="sendButton" disabled>
              Send
            </button>
          </div>
        </div>

        <script 
          type="text/javascript"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: temporary
          dangerouslySetInnerHTML={{
            __html: `
              document.addEventListener('DOMContentLoaded', () => {
                const urlElement = document.getElementById('current-url');
                if (urlElement) {
                  urlElement.textContent = window.location.href;
                }
              });
            `
          }}
        />
        <script src="/static/ChatPage.js"></script>
      </body>
    </html>
  );
}
