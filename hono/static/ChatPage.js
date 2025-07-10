const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const statusDiv = document.getElementById("status");

// Get CSS classes from data attributes
const container = document.querySelector("[data-status-class]");
const statusClass = container.getAttribute("data-status-class");
const connectedClass = container.getAttribute("data-connected-class");
const disconnectedClass = container.getAttribute("data-disconnected-class");
const messageClass = container.getAttribute("data-message-class");

// WebSocket connection
const ws = new WebSocket("ws://localhost:3000/ws");

ws.onopen = (event) => {
  console.log("Connected to WebSocket");
  statusDiv.textContent = "Connected";
  statusDiv.className = statusClass + " " + connectedClass;
  messageInput.disabled = false;
  sendButton.disabled = false;
};

ws.onmessage = (event) => {
  const message = event.data;
  const messageElement = document.createElement("div");
  messageElement.className = messageClass;
  messageElement.textContent = message;
  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
};

ws.onclose = (event) => {
  console.log("Disconnected from WebSocket");
  statusDiv.textContent = "Disconnected";
  statusDiv.className = statusClass + " " + disconnectedClass;
  messageInput.disabled = true;
  sendButton.disabled = true;
};

ws.onerror = (error) => {
  console.error("WebSocket error:", error);
  statusDiv.textContent = "Connection Error";
  statusDiv.className = statusClass + " " + disconnectedClass;
};

// Send message function
function sendMessage() {
  const message = messageInput.value.trim();
  if (message && ws.readyState === WebSocket.OPEN) {
    ws.send(message);
    messageInput.value = "";
  }
}

// Event listeners
sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// Focus on input when page loads
window.addEventListener("load", () => {
  messageInput.focus();
});
