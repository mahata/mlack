import { css, Style } from "hono/css";

export async function ChatPage() {
  const containerClass = await css`
    background-color: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  `;

  const messageClass = await css`
    margin-bottom: 10px;
    padding: 8px;
    background-color: #e3f2fd;
    border-radius: 4px;
    border-left: 4px solid #2196f3;
  `;

  const inputContainerClass = await css`
    display: flex;
    gap: 10px;
  `;

  const statusClass = await css`
    text-align: center;
    margin-bottom: 20px;
    font-weight: bold;
  `;

  const connectedClass = await css`
    color: #4caf50;
  `;

  const disconnectedClass = await css`
    color: #f44336;
  `;

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
          `}
        </style>
      </head>
      <body>
        <div className={containerClass}>
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

        <script>
          {`
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const statusDiv = document.getElementById('status');

        // CSS classes from hono/css
        const statusClass = '${statusClass}';
        const connectedClass = '${connectedClass}';
        const disconnectedClass = '${disconnectedClass}';
        const messageClass = '${messageClass}';

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
          `}
        </script>
      </body>
    </html>
  );
}
