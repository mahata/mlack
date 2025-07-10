const messagesDiv = document.getElementById("messages") as HTMLDivElement;
const messageInput = document.getElementById("messageInput") as HTMLInputElement;
const sendButton = document.getElementById("sendButton") as HTMLButtonElement;
const statusDiv = document.getElementById("status") as HTMLDivElement;

// Get CSS classes from data attributes
const container = document.querySelector("[data-status-class]") as HTMLElement;
const statusClass = container.getAttribute("data-status-class") as string;
const connectedClass = container.getAttribute("data-connected-class") as string;
const disconnectedClass = container.getAttribute("data-disconnected-class") as string;
const messageClass = container.getAttribute("data-message-class") as string;

// WebSocket connection
const ws = new WebSocket("ws://localhost:3000/ws");

ws.onopen = (_event: Event) => {
  console.log("Connected to WebSocket");
  statusDiv.textContent = "Connected";
  statusDiv.className = `${statusClass} ${connectedClass}`;
  messageInput.disabled = false;
  sendButton.disabled = false;
};

ws.onmessage = (event: MessageEvent) => {
  const message = event.data as string;
  const messageElement = document.createElement("div");
  messageElement.className = messageClass;
  messageElement.textContent = message;
  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
};

ws.onclose = (_event: CloseEvent) => {
  console.log("Disconnected from WebSocket");
  statusDiv.textContent = "Disconnected";
  statusDiv.className = `${statusClass} ${disconnectedClass}`;
  messageInput.disabled = true;
  sendButton.disabled = true;
};

ws.onerror = (error: Event) => {
  console.error("WebSocket error:", error);
  statusDiv.textContent = "Connection Error";
  statusDiv.className = `${statusClass} ${disconnectedClass}`;
};

// Send message function
function sendMessage(): void {
  const message = messageInput.value.trim();
  if (message && ws.readyState === WebSocket.OPEN) {
    ws.send(message);
    messageInput.value = "";
  }
}

// Event listeners
sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e: KeyboardEvent) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

// Focus on input when page loads
window.addEventListener("load", () => {
  messageInput.focus();
});
