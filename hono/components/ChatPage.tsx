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
        <style>
          {`
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 20px;
        }
        #messages {
            height: 400px;
            overflow-y: auto;
            border: 1px solid #ddd;
            padding: 10px;
            margin-bottom: 20px;
            background-color: #fafafa;
            border-radius: 4px;
        }
        #messageInput {
            flex: 1;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
        }
        #sendButton {
            padding: 10px 20px;
            background-color: #2196f3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        #sendButton:hover {
            background-color: #1976d2;
        }
        #sendButton:disabled {
            background-color: #ccc;
            cursor: not-allowed;
        }
        .css-3719599696 {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .css-1569315864 {
            margin-bottom: 10px;
            padding: 8px;
            background-color: #e3f2fd;
            border-radius: 4px;
            border-left: 4px solid #2196f3;
        }
        .css-4040854844 {
            display: flex;
            gap: 10px;
        }
        .css-279625048 {
            text-align: center;
            margin-bottom: 20px;
            font-weight: bold;
        }
        .css-2506884646 {
            color: #4caf50;
        }
        .css-3383144041 {
            color: #f44336;
        }
          `}
        </style>
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

        <script type="module" src="/static/chat-page-client.js"></script>
      </body>
    </html>
  );
}
