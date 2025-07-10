import { createCssContext } from "hono/css";

const { css, Style } = createCssContext({ id: "hono-css" });

export async function ChatPage() {
  // Generate all CSS classes and collect their styles
  const [containerClass, messageClass, inputContainerClass, statusClass, connectedClass, disconnectedClass] =
    await Promise.all([
      css`
      background-color: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    `,
      css`
      margin-bottom: 10px;
      padding: 8px;
      background-color: #e3f2fd;
      border-radius: 4px;
      border-left: 4px solid #2196f3;
    `,
      css`
      display: flex;
      gap: 10px;
    `,
      css`
      text-align: center;
      margin-bottom: 20px;
      font-weight: bold;
    `,
      css`
      color: #4caf50;
    `,
      css`
      color: #f44336;
    `,
    ]);

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>MLack - Real-time Chat</title>
        <Style />
        <link rel="stylesheet" href="/components/ChatPage.css" />
      </head>
      <body>
        <div
          className={containerClass}
          data-status-class={statusClass}
          data-connected-class={connectedClass}
          data-disconnected-class={disconnectedClass}
          data-message-class={messageClass}
        >
          <h1>Hello, world!</h1>
          <div id="status" className={`${statusClass} ${disconnectedClass}`}>
            Connecting...
          </div>
          <div id="messages"></div>
          <div className={inputContainerClass}>
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
