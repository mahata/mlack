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
const wsUrl = container.getAttribute("data-ws-url") as string;

// Configurable timeout (milliseconds) for loading existing messages.
// Read from data-messages-timeout-ms; fall back to a safer default if unset/invalid.
const messagesTimeoutAttr = container.getAttribute("data-messages-timeout-ms");
const DEFAULT_MESSAGES_TIMEOUT_MS = 15000;
const messagesTimeoutMsRaw = messagesTimeoutAttr !== null ? Number(messagesTimeoutAttr) : NaN;
const messagesTimeoutMs =
  Number.isFinite(messagesTimeoutMsRaw) && messagesTimeoutMsRaw >= 0
    ? messagesTimeoutMsRaw
    : DEFAULT_MESSAGES_TIMEOUT_MS;

// Function to display a message
function displayMessage(messageText: string): void {
  const messageElement = document.createElement("div");
  messageElement.className = messageClass;
  messageElement.textContent = messageText;
  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Load existing messages from API
async function loadExistingMessages(): Promise<void> {
  const controller = new AbortController();
  const timeoutId =
    messagesTimeoutMs > 0 ? setTimeout(() => controller.abort(), messagesTimeoutMs) : undefined;
  try {
    const response = await fetch("/api/messages", { signal: controller.signal });
    if (response.ok) {
      const data = await response.json();
      if (data.messages) {
        data.messages.forEach((msg: { content: string; userEmail: string; userName?: string }) => {
          const formattedMessage = `${msg.userName || msg.userEmail}: ${msg.content}`;
          displayMessage(formattedMessage);
        });
      }
    } else {
      console.error("Failed to load existing messages:", response.status);
    }
  } catch (error: unknown) {
    // Ignore or de‑emphasize expected aborts due to the timeout.
    if (error instanceof DOMException && error.name === "AbortError") {
      console.info("Loading existing messages was aborted (timeout).");
      return;
    }
    console.error("Error loading existing messages:", error);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

// WebSocket connection
const ws = new WebSocket(wsUrl);

ws.onopen = (_event: Event) => {
  console.log("Connected to WebSocket");
  statusDiv.textContent = "Connected";
  statusDiv.className = `${statusClass} ${connectedClass}`;
  messageInput.disabled = false;
  sendButton.disabled = false;
};

ws.onmessage = (event: MessageEvent) => {
  const message = event.data as string;
  displayMessage(message);
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

// Focus on input when page loads and load existing messages
window.addEventListener("load", () => {
  messageInput.focus();
  loadExistingMessages();
});
