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

        <script>{`
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const statusDiv = document.getElementById('status');

        // Get CSS classes from data attributes
        const container = document.querySelector('[data-status-class]');
        const statusClass = container.getAttribute('data-status-class');
        const connectedClass = container.getAttribute('data-connected-class');
        const disconnectedClass = container.getAttribute('data-disconnected-class');
        const messageClass = container.getAttribute('data-message-class');

        // WebSocket connection
        const ws = new WebSocket('ws://localhost:3000/ws');

        ws.onopen = function(event) {
            console.log('Connected to WebSocket');
            statusDiv.textContent = 'Connected';
            statusDiv.className = statusClass + ' ' + connectedClass;
            messageInput.disabled = false;
            sendButton.disabled = false;
        };

        ws.onmessage = function(event) {
            const message = event.data;
            const messageElement = document.createElement('div');
            messageElement.className = messageClass;
            messageElement.textContent = message;
            messagesDiv.appendChild(messageElement);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        };

        ws.onclose = function(event) {
            console.log('Disconnected from WebSocket');
            statusDiv.textContent = 'Disconnected';
            statusDiv.className = statusClass + ' ' + disconnectedClass;
            messageInput.disabled = true;
            sendButton.disabled = true;
        };

        ws.onerror = function(error) {
            console.error('WebSocket error:', error);
            statusDiv.textContent = 'Connection Error';
            statusDiv.className = statusClass + ' ' + disconnectedClass;
        };

        // Send message function
        function sendMessage() {
            const message = messageInput.value.trim();
            if (message && ws.readyState === WebSocket.OPEN) {
                ws.send(message);
                messageInput.value = '';
            }
        }

        // Event listeners
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        // Focus on input when page loads
        window.addEventListener('load', function() {
            messageInput.focus();
        });
        `}</script>
      </body>
    </html>
  );
}
