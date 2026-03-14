const messagesDiv = document.getElementById("messages") as HTMLDivElement;
const messageInput = document.getElementById("messageInput") as HTMLInputElement;
const sendButton = document.getElementById("sendButton") as HTMLButtonElement;
const statusDiv = document.getElementById("status") as HTMLDivElement;

const STATUS_CLASS = "status";
const CONNECTED_CLASS = "connected";
const DISCONNECTED_CLASS = "disconnected";
const MESSAGE_CLASS = "message";
const MESSAGES_TIMEOUT_MS = 15000;

const container = document.querySelector("[data-ws-url]") as HTMLElement;
const wsUrl = container.getAttribute("data-ws-url") as string;

// Function to display a message
function displayMessage(messageText: string): void {
  const messageElement = document.createElement("div");
  messageElement.className = MESSAGE_CLASS;
  messageElement.textContent = messageText;
  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Load existing messages from API
async function loadExistingMessages(): Promise<void> {
  const controller = new AbortController();
  const timeoutId =
    MESSAGES_TIMEOUT_MS > 0 ? setTimeout(() => controller.abort(), MESSAGES_TIMEOUT_MS) : undefined;
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
  statusDiv.className = `${STATUS_CLASS} ${CONNECTED_CLASS}`;
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
  statusDiv.className = `${STATUS_CLASS} ${DISCONNECTED_CLASS}`;
  messageInput.disabled = true;
  sendButton.disabled = true;
};

ws.onerror = (error: Event) => {
  console.error("WebSocket error:", error);
  statusDiv.textContent = "Connection Error";
  statusDiv.className = `${STATUS_CLASS} ${DISCONNECTED_CLASS}`;
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
