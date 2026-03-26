const messagesDiv = document.getElementById("messages") as HTMLDivElement;
const messageInput = document.getElementById("messageInput") as HTMLInputElement;
const sendButton = document.getElementById("sendButton") as HTMLButtonElement;
const statusDiv = document.getElementById("status") as HTMLDivElement;
const channelNameHeader = document.getElementById("channelName") as HTMLHeadingElement;
const channelListEl = document.getElementById("channelList") as HTMLUListElement;
const browseChannelListEl = document.getElementById("browseChannelList") as HTMLUListElement;
const createChannelButton = document.getElementById("createChannelButton") as HTMLButtonElement;
const createChannelModal = document.getElementById("createChannelModal") as HTMLDivElement;
const newChannelNameInput = document.getElementById("newChannelName") as HTMLInputElement;
const cancelCreateChannel = document.getElementById("cancelCreateChannel") as HTMLButtonElement;
const confirmCreateChannel = document.getElementById("confirmCreateChannel") as HTMLButtonElement;

const STATUS_CLASS = "status";
const CONNECTED_CLASS = "connected";
const DISCONNECTED_CLASS = "disconnected";
const MESSAGE_CLASS = "message";
const MESSAGES_TIMEOUT_MS = 15000;

const container = document.querySelector("[data-ws-url]") as HTMLElement;
const wsUrl = container.getAttribute("data-ws-url") as string;

type Channel = {
  id: number;
  name: string;
  createdByEmail: string;
};

let activeChannelId: number | null = null;
let myChannelIds: Set<number> = new Set();
let allChannels: Channel[] = [];

function displayMessage(messageText: string): void {
  const messageElement = document.createElement("div");
  messageElement.className = MESSAGE_CLASS;
  messageElement.textContent = messageText;
  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function clearMessages(): void {
  messagesDiv.innerHTML = "";
}

async function loadMessagesForChannel(channelId: number): Promise<void> {
  clearMessages();
  const controller = new AbortController();
  const timeoutId =
    MESSAGES_TIMEOUT_MS > 0 ? setTimeout(() => controller.abort(), MESSAGES_TIMEOUT_MS) : undefined;
  try {
    const response = await fetch(`/api/messages?channelId=${channelId}`, { signal: controller.signal });
    if (response.ok) {
      const data = await response.json();
      if (data.messages) {
        data.messages.forEach((msg: { content: string; userEmail: string; userName?: string }) => {
          const formattedMessage = `${msg.userName || msg.userEmail}: ${msg.content}`;
          displayMessage(formattedMessage);
        });
      }
    } else {
      console.error("Failed to load messages:", response.status);
    }
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      console.info("Loading messages was aborted (timeout).");
      return;
    }
    console.error("Error loading messages:", error);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

async function fetchChannels(): Promise<void> {
  try {
    const response = await fetch("/api/channels");
    if (response.ok) {
      const data = await response.json();
      allChannels = data.channels || [];
    }
  } catch (error) {
    console.error("Error fetching channels:", error);
  }
}

function renderChannelLists(): void {
  channelListEl.innerHTML = "";
  browseChannelListEl.innerHTML = "";

  const myChannels = allChannels.filter((ch) => myChannelIds.has(ch.id));
  const otherChannels = allChannels.filter((ch) => !myChannelIds.has(ch.id));

  for (const ch of myChannels) {
    const li = document.createElement("li");
    li.className = `channel-item${ch.id === activeChannelId ? " active" : ""}`;

    const nameSpan = document.createElement("span");
    nameSpan.className = "channel-item-name";
    nameSpan.textContent = `# ${ch.name}`;
    nameSpan.addEventListener("click", () => switchChannel(ch.id, ch.name));
    li.appendChild(nameSpan);

    if (ch.name !== "general") {
      const leaveBtn = document.createElement("button");
      leaveBtn.className = "channel-leave-button";
      leaveBtn.textContent = "Leave";
      leaveBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        leaveChannel(ch.id);
      });
      li.appendChild(leaveBtn);
    }

    channelListEl.appendChild(li);
  }

  for (const ch of otherChannels) {
    const li = document.createElement("li");
    li.className = "channel-item browse-item";

    const nameSpan = document.createElement("span");
    nameSpan.className = "channel-item-name";
    nameSpan.textContent = `# ${ch.name}`;
    li.appendChild(nameSpan);

    const joinBtn = document.createElement("button");
    joinBtn.className = "channel-join-button";
    joinBtn.textContent = "Join";
    joinBtn.addEventListener("click", () => joinChannel(ch.id));
    li.appendChild(joinBtn);

    browseChannelListEl.appendChild(li);
  }
}

async function detectMyChannels(): Promise<void> {
  myChannelIds = new Set();
  for (const ch of allChannels) {
    try {
      const response = await fetch(`/api/channels/${ch.id}/join`, { method: "POST" });
      if (response.ok) {
        const body = await response.json();
        if (body.message === "Already a member" || body.message === "Joined channel") {
          myChannelIds.add(ch.id);
        }
      }
    } catch {
      // skip
    }
  }
}

async function initChannels(): Promise<void> {
  await fetchChannels();

  // The user is auto-joined to #general on page load by the server.
  // Detect membership: the simplest approach is to try joining each channel
  // and checking the response. But that would actually join them to every channel.
  // Instead, we'll just use a simple heuristic: assume we're members of #general,
  // and store memberships client-side as we join/leave.
  // For now, assume membership of #general (server auto-joins), and load full list.
  const generalChannel = allChannels.find((ch) => ch.name === "general");
  if (generalChannel) {
    myChannelIds.add(generalChannel.id);
    activeChannelId = generalChannel.id;
    channelNameHeader.textContent = `#${generalChannel.name}`;
  }

  // Fetch actual memberships by trying a simple check
  // We'll use a lightweight approach: fetch messages for each channel.
  // Actually the simplest: the server auto-joins general. For other channels,
  // we track locally. Let's fetch memberships properly with a dedicated approach.
  // Since we don't have a "my channels" endpoint yet, we mark general as joined
  // and let the user join others via Browse.
  renderChannelLists();

  if (activeChannelId) {
    await loadMessagesForChannel(activeChannelId);
  }
}

async function switchChannel(channelId: number, channelName: string): Promise<void> {
  if (channelId === activeChannelId) return;
  activeChannelId = channelId;
  channelNameHeader.textContent = `#${channelName}`;
  renderChannelLists();
  await loadMessagesForChannel(channelId);
  messageInput.focus();
}

async function joinChannel(channelId: number): Promise<void> {
  try {
    const response = await fetch(`/api/channels/${channelId}/join`, { method: "POST" });
    if (response.ok) {
      myChannelIds.add(channelId);
      const ch = allChannels.find((c) => c.id === channelId);
      renderChannelLists();
      if (ch) {
        await switchChannel(channelId, ch.name);
      }
    }
  } catch (error) {
    console.error("Error joining channel:", error);
  }
}

async function leaveChannel(channelId: number): Promise<void> {
  try {
    const response = await fetch(`/api/channels/${channelId}/leave`, { method: "POST" });
    if (response.ok) {
      myChannelIds.delete(channelId);
      if (activeChannelId === channelId) {
        const generalChannel = allChannels.find((ch) => ch.name === "general");
        if (generalChannel) {
          await switchChannel(generalChannel.id, generalChannel.name);
        }
      }
      renderChannelLists();
    }
  } catch (error) {
    console.error("Error leaving channel:", error);
  }
}

async function createChannel(name: string): Promise<void> {
  try {
    const response = await fetch("/api/channels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (response.ok) {
      const data = await response.json();
      const newChannel: Channel = data.channel;
      allChannels.push(newChannel);
      myChannelIds.add(newChannel.id);
      renderChannelLists();
      await switchChannel(newChannel.id, newChannel.name);
    } else {
      const data = await response.json();
      alert(data.error || "Failed to create channel");
    }
  } catch (error) {
    console.error("Error creating channel:", error);
  }
}

// Modal handlers
createChannelButton.addEventListener("click", () => {
  createChannelModal.classList.remove("hidden");
  newChannelNameInput.value = "";
  newChannelNameInput.focus();
});

cancelCreateChannel.addEventListener("click", () => {
  createChannelModal.classList.add("hidden");
});

confirmCreateChannel.addEventListener("click", () => {
  const name = newChannelNameInput.value.trim();
  if (name) {
    createChannelModal.classList.add("hidden");
    createChannel(name);
  }
});

newChannelNameInput.addEventListener("keypress", (e: KeyboardEvent) => {
  if (e.key === "Enter") {
    const name = newChannelNameInput.value.trim();
    if (name) {
      createChannelModal.classList.add("hidden");
      createChannel(name);
    }
  }
});

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
  try {
    const data = JSON.parse(event.data as string);
    if (data.type === "message" && data.channelId === activeChannelId) {
      const formattedMessage = `${data.userName || data.userEmail}: ${data.content}`;
      displayMessage(formattedMessage);
    }
  } catch {
    // Ignore non-JSON messages
  }
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

function sendMessage(): void {
  const message = messageInput.value.trim();
  if (message && ws.readyState === WebSocket.OPEN && activeChannelId !== null) {
    ws.send(JSON.stringify({ type: "message", channelId: activeChannelId, content: message }));
    messageInput.value = "";
  }
}

sendButton.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e: KeyboardEvent) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

window.addEventListener("load", () => {
  messageInput.focus();
  initChannels();
});
