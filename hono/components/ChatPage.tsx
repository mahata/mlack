import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Manual CSS modules implementation
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateCSSModules(cssContent: string, _filename: string) {
  // Generate a simple hash for scoping (in a real implementation this would be more robust)
  const hash = "chatpage";

  // Create a mapping of class names to scoped names
  const classRegex = /\.([a-zA-Z][a-zA-Z0-9_-]*)/g;
  const classNames: Record<string, string> = {};
  const scopedCSS = cssContent.replace(classRegex, (_match, className) => {
    const scopedName = `${className}_${hash}`;
    classNames[className] = scopedName;
    return `.${scopedName}`;
  });

  return { classNames, scopedCSS };
}

// Read and process the CSS file
const cssPath = join(__dirname, "ChatPage.module.css");
const cssContent = readFileSync(cssPath, "utf-8");
const { classNames: styles, scopedCSS } = generateCSSModules(cssContent, "ChatPage");

export function ChatPage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>MLack - Real-time Chat</title>
        <style>
          {`
        body {
            margin: 0;
            padding: 0;
        }
        ${scopedCSS}
          `}
        </style>
      </head>
      <body>
        <div className={styles.page}>
          <div className={styles.container}>
            <h1 className={styles.title}>Hello, world!</h1>
            <div id="status" className={`${styles.status} ${styles.disconnected}`}>
              Connecting...
            </div>
            <div id="messages" className={styles.messages}></div>
            <div className={styles.inputContainer}>
              <input
                type="text"
                id="messageInput"
                className={styles.messageInput}
                placeholder="Type your message..."
                disabled
              />
              <button type="button" id="sendButton" className={styles.sendButton} disabled>
                Send
              </button>
            </div>
          </div>
        </div>

        <script>
          {`
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        const statusDiv = document.getElementById('status');

        // WebSocket connection
        const ws = new WebSocket('ws://localhost:3000/ws');

        ws.onopen = function(event) {
            console.log('Connected to WebSocket');
            statusDiv.textContent = 'Connected';
            statusDiv.className = '${styles.status} ${styles.connected}';
            messageInput.disabled = false;
            sendButton.disabled = false;
        };

        ws.onmessage = function(event) {
            const message = event.data;
            const messageElement = document.createElement('div');
            messageElement.className = '${styles.message}';
            messageElement.textContent = message;
            messagesDiv.appendChild(messageElement);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        };

        ws.onclose = function(event) {
            console.log('Disconnected from WebSocket');
            statusDiv.textContent = 'Disconnected';
            statusDiv.className = '${styles.status} ${styles.disconnected}';
            messageInput.disabled = true;
            sendButton.disabled = true;
        };

        ws.onerror = function(error) {
            console.error('WebSocket error:', error);
            statusDiv.textContent = 'Connection Error';
            statusDiv.className = '${styles.status} ${styles.disconnected}';
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
