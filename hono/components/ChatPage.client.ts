// Client-side WebSocket and DOM logic for ChatPage
// This file contains all browser-side functionality previously embedded in ChatPage.tsx

interface ChatPageElements {
  messagesDiv: HTMLElement;
  messageInput: HTMLInputElement;
  sendButton: HTMLButtonElement;
  statusDiv: HTMLElement;
}

interface ChatPageClasses {
  statusClass: string;
  connectedClass: string;
  disconnectedClass: string;
  messageClass: string;
}

export class ChatPageClient {
  private elements: ChatPageElements;
  private classes: ChatPageClasses;
  private ws: WebSocket | null = null;

  constructor() {
    this.elements = this.getElements();
    this.classes = this.getClasses();
    this.initialize();
  }

  private getElements(): ChatPageElements {
    const messagesDiv = document.getElementById("messages");
    const messageInput = document.getElementById("messageInput") as HTMLInputElement;
    const sendButton = document.getElementById("sendButton") as HTMLButtonElement;
    const statusDiv = document.getElementById("status");

    if (!messagesDiv || !messageInput || !sendButton || !statusDiv) {
      throw new Error("Required DOM elements not found");
    }

    return {
      messagesDiv,
      messageInput,
      sendButton,
      statusDiv,
    };
  }

  private getClasses(): ChatPageClasses {
    // Get CSS classes from data attributes
    const container = document.querySelector("[data-status-class]");
    if (!container) {
      throw new Error("Container with data attributes not found");
    }

    const statusClass = container.getAttribute("data-status-class");
    const connectedClass = container.getAttribute("data-connected-class");
    const disconnectedClass = container.getAttribute("data-disconnected-class");
    const messageClass = container.getAttribute("data-message-class");

    if (!statusClass || !connectedClass || !disconnectedClass || !messageClass) {
      throw new Error("Required CSS class data attributes not found");
    }

    return {
      statusClass,
      connectedClass,
      disconnectedClass,
      messageClass,
    };
  }

  private initialize(): void {
    this.setupWebSocket();
    this.setupEventListeners();
    this.focusInput();
  }

  private setupWebSocket(): void {
    // WebSocket connection
    this.ws = new WebSocket("ws://localhost:3000/ws");

    this.ws.onopen = (_event) => {
      console.log("Connected to WebSocket");
      this.updateStatus("Connected", true);
      this.enableInput();
    };

    this.ws.onmessage = (event) => {
      this.addMessage(event.data);
    };

    this.ws.onclose = (_event) => {
      console.log("Disconnected from WebSocket");
      this.updateStatus("Disconnected", false);
      this.disableInput();
    };

    this.ws.onerror = (_error) => {
      console.error("WebSocket error:", _error);
      this.updateStatus("Connection Error", false);
    };
  }

  private updateStatus(text: string, connected: boolean): void {
    const { statusDiv } = this.elements;
    const { statusClass, connectedClass, disconnectedClass } = this.classes;

    statusDiv.textContent = text;
    statusDiv.className = `${statusClass} ${connected ? connectedClass : disconnectedClass}`;
  }

  private enableInput(): void {
    this.elements.messageInput.disabled = false;
    this.elements.sendButton.disabled = false;
  }

  private disableInput(): void {
    this.elements.messageInput.disabled = true;
    this.elements.sendButton.disabled = true;
  }

  private addMessage(message: string): void {
    const { messagesDiv } = this.elements;
    const { messageClass } = this.classes;

    const messageElement = document.createElement("div");
    messageElement.className = messageClass;
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  private sendMessage(): void {
    const { messageInput } = this.elements;
    const message = messageInput.value.trim();

    if (message && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(message);
      messageInput.value = "";
    }
  }

  private setupEventListeners(): void {
    const { sendButton, messageInput } = this.elements;

    // Send button click
    sendButton.addEventListener("click", () => {
      this.sendMessage();
    });

    // Enter key in input
    messageInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        this.sendMessage();
      }
    });
  }

  private focusInput(): void {
    // Focus on input when page loads
    window.addEventListener("load", () => {
      this.elements.messageInput.focus();
    });
  }
}

// Initialize the chat page when DOM is ready
if (typeof window !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      new ChatPageClient();
    });
  } else {
    new ChatPageClient();
  }
}
