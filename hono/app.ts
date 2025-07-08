import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import type { WSContext } from "hono/ws";
import { WebSocket } from "ws";

const app = new Hono();

// Create WebSocket helper
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// Store connected WebSocket clients
const clients = new Set<WSContext>();

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    message: "Service is running",
  });
});

// Root page with chat interface
app.get("/", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MLack - Real-time Chat</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .container {
                background-color: white;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
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
            .message {
                margin-bottom: 10px;
                padding: 8px;
                background-color: #e3f2fd;
                border-radius: 4px;
                border-left: 4px solid #2196f3;
            }
            .input-container {
                display: flex;
                gap: 10px;
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
            .status {
                text-align: center;
                margin-bottom: 20px;
                font-weight: bold;
            }
            .connected {
                color: #4caf50;
            }
            .disconnected {
                color: #f44336;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Hello, world!</h1>
            <div id="status" class="status disconnected">Connecting...</div>
            <div id="messages"></div>
            <div class="input-container">
                <input type="text" id="messageInput" placeholder="Type your message..." disabled>
                <button id="sendButton" disabled>Send</button>
            </div>
        </div>

        <script>
            const messagesDiv = document.getElementById('messages');
            const messageInput = document.getElementById('messageInput');
            const sendButton = document.getElementById('sendButton');
            const statusDiv = document.getElementById('status');

            // WebSocket connection
            const ws = new WebSocket('ws://localhost:3000/ws');

            ws.onopen = function(event) {
                console.log('Connected to WebSocket');
                statusDiv.textContent = 'Connected';
                statusDiv.className = 'status connected';
                messageInput.disabled = false;
                sendButton.disabled = false;
            };

            ws.onmessage = function(event) {
                const message = event.data;
                const messageElement = document.createElement('div');
                messageElement.className = 'message';
                messageElement.textContent = message;
                messagesDiv.appendChild(messageElement);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            };

            ws.onclose = function(event) {
                console.log('Disconnected from WebSocket');
                statusDiv.textContent = 'Disconnected';
                statusDiv.className = 'status disconnected';
                messageInput.disabled = true;
                sendButton.disabled = true;
            };

            ws.onerror = function(error) {
                console.error('WebSocket error:', error);
                statusDiv.textContent = 'Connection Error';
                statusDiv.className = 'status disconnected';
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
        </script>
    </body>
    </html>
  `);
});

// WebSocket endpoint
app.get(
  "/ws",
  upgradeWebSocket(() => {
    return {
      onOpen: (_evt, ws) => {
        console.log("WebSocket client connected");
        clients.add(ws);
      },
      onMessage: (evt) => {
        const message = evt.data;
        console.log("Received message:", message);

        // Convert message to string if it's not already
        let messageStr: string;
        if (typeof message === "string") {
          messageStr = message;
        } else if (message instanceof ArrayBuffer) {
          messageStr = new TextDecoder().decode(message);
        } else if (message instanceof Uint8Array) {
          messageStr = new TextDecoder().decode(message);
        } else {
          messageStr = String(message);
        }

        // Broadcast message to all connected clients
        clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(messageStr);
          }
        });
      },
      onClose: (_evt, ws) => {
        console.log("WebSocket client disconnected");
        clients.delete(ws);
      },
      onError: (evt, ws) => {
        console.error("WebSocket error:", evt);
        clients.delete(ws);
      },
    };
  }),
);

export { app, injectWebSocket };
