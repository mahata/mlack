(() => {
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
  const membersPanel = document.getElementById("membersPanel") as HTMLElement;
  const membersList = document.getElementById("membersList") as HTMLUListElement;
  const toggleMembersButton = document.getElementById("toggleMembersButton") as HTMLButtonElement;
  const createWorkspaceButton = document.getElementById("createWorkspaceButton") as HTMLButtonElement;
  const createWorkspaceModal = document.getElementById("createWorkspaceModal") as HTMLDivElement;
  const workspaceModal = (
    window as unknown as {
      initWorkspaceModal: (elements: {
        createWorkspaceModal: HTMLDivElement;
        workspaceNameInput: HTMLInputElement;
        workspaceSlugInput: HTMLInputElement;
        slugPreviewValue: HTMLSpanElement;
        createWorkspaceError: HTMLParagraphElement;
        cancelCreateWorkspace: HTMLButtonElement;
        confirmCreateWorkspace: HTMLButtonElement;
        createWorkspaceButton: HTMLButtonElement;
      }) => { closeModal: () => void; isModalVisible: () => boolean };
    }
  ).initWorkspaceModal({
    createWorkspaceModal,
    workspaceNameInput: document.getElementById("workspaceName") as HTMLInputElement,
    workspaceSlugInput: document.getElementById("workspaceSlug") as HTMLInputElement,
    slugPreviewValue: document.getElementById("slugPreviewValue") as HTMLSpanElement,
    createWorkspaceError: document.getElementById("createWorkspaceError") as HTMLParagraphElement,
    cancelCreateWorkspace: document.getElementById("cancelCreateWorkspace") as HTMLButtonElement,
    confirmCreateWorkspace: document.getElementById("confirmCreateWorkspace") as HTMLButtonElement,
    createWorkspaceButton,
  });
  const sidebar = document.getElementById("sidebar") as HTMLElement;
  const sidebarOverlay = document.getElementById("sidebarOverlay") as HTMLDivElement;
  const sidebarToggle = document.getElementById("sidebarToggle") as HTMLButtonElement;
  const fileInput = document.getElementById("fileInput") as HTMLInputElement;
  const attachButton = document.getElementById("attachButton") as HTMLButtonElement;
  const attachmentPreview = document.getElementById("attachmentPreview") as HTMLDivElement;
  const dmListEl = document.getElementById("dmList") as HTMLUListElement;
  const dmComposeButton = document.getElementById("dmComposeButton") as HTMLButtonElement;
  const dmComposeModal = document.getElementById("dmComposeModal") as HTMLDivElement;
  const dmSearchInput = document.getElementById("dmSearchInput") as HTMLInputElement;
  const dmMemberListEl = document.getElementById("dmMemberList") as HTMLUListElement;

  const STATUS_CLASS = "status";
  const CONNECTED_CLASS = "connected";
  const DISCONNECTED_CLASS = "disconnected";
  const RECONNECTING_CLASS = "reconnecting";
  const MESSAGE_CLASS = "message";
  const MESSAGES_TIMEOUT_MS = 15000;

  const INITIAL_RECONNECT_DELAY_MS = 1000;
  const MAX_RECONNECT_DELAY_MS = 30000;
  const BACKOFF_MULTIPLIER = 2;
  const UNAUTHORIZED_CLOSE_CODE = 1008;
  const MAX_FILE_SIZE = 25 * 1024 * 1024;

  const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm"]);

  const container = document.querySelector("[data-ws-url]") as HTMLElement;
  const wsUrl = container.getAttribute("data-ws-url") as string;
  const workspaceSlug = container.getAttribute("data-workspace-slug") as string;
  const apiBase = `/w/${workspaceSlug}/api`;

  type Channel = {
    id: number;
    name: string;
    createdByEmail: string;
  };

  type Member = {
    email: string;
    name: string;
  };

  type DmConversation = {
    id: number;
    otherUserEmail: string;
    otherUserName: string;
    createdAt: string | null;
  };

  type ViewMode = "channel" | "dm";

  let activeChannelId: number | null = null;
  const myChannelIds: Set<number> = new Set();
  let allChannels: Channel[] = [];
  let currentMembers: Member[] = [];
  let currentUserEmail = "";
  let membersPanelVisible = true;
  let pendingFile: File | null = null;
  let isUploading = false;
  let viewMode: ViewMode = "channel";
  let activeDmConversationId: number | null = null;
  let dmConversations: DmConversation[] = [];
  let allWorkspaceMembers: Member[] = [];

  const MOBILE_BREAKPOINT = 768;
  const TABLET_BREAKPOINT = 1024;

  function isMobileView(): boolean {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function isTabletView(): boolean {
    return window.innerWidth <= TABLET_BREAKPOINT;
  }

  function openSidebar(): void {
    sidebar.classList.add("open");
    sidebarOverlay.classList.remove("hidden");
    sidebarToggle.setAttribute("aria-expanded", "true");
  }

  function closeSidebar(): void {
    sidebar.classList.remove("open");
    sidebarOverlay.classList.add("hidden");
    sidebarToggle.setAttribute("aria-expanded", "false");
  }

  function toggleSidebar(): void {
    if (sidebar.classList.contains("open")) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  let ws: WebSocket;
  let reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

  function detectCurrentUserEmail(): void {
    const userEmailEl = document.querySelector(".user-email");
    if (userEmailEl) {
      currentUserEmail = userEmailEl.textContent?.trim() || "";
    }
  }

  type MessageData = {
    content: string;
    userEmail: string;
    userName?: string;
    attachmentKey?: string | null;
    attachmentName?: string | null;
    attachmentType?: string | null;
    attachmentSize?: number | null;
  };

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function buildFileUrl(key: string): string {
    return `${apiBase}/files/${key}`;
  }

  function displayMessage(msg: MessageData): void {
    const messageElement = document.createElement("div");
    messageElement.className = MESSAGE_CLASS;

    const senderName = msg.userName || msg.userEmail;

    if (msg.content) {
      const textEl = document.createElement("div");
      textEl.className = "message-text";
      textEl.textContent = `${senderName}: ${msg.content}`;
      messageElement.appendChild(textEl);
    } else {
      const textEl = document.createElement("div");
      textEl.className = "message-text";
      textEl.textContent = `${senderName}:`;
      messageElement.appendChild(textEl);
    }

    if (msg.attachmentKey && msg.attachmentType) {
      const attachEl = document.createElement("div");
      attachEl.className = "message-attachment";
      const fileUrl = buildFileUrl(msg.attachmentKey);

      if (msg.attachmentType.startsWith("image/")) {
        const imageLink = document.createElement("a");
        imageLink.href = fileUrl;
        imageLink.target = "_blank";
        imageLink.rel = "noopener noreferrer";

        const img = document.createElement("img");
        img.src = fileUrl;
        img.alt = msg.attachmentName || "Image";
        img.loading = "lazy";

        imageLink.appendChild(img);
        attachEl.appendChild(imageLink);
      } else if (msg.attachmentType.startsWith("video/")) {
        const video = document.createElement("video");
        video.src = fileUrl;
        video.controls = true;
        video.preload = "metadata";
        attachEl.appendChild(video);
      }

      messageElement.appendChild(attachEl);
    }

    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }

  function clearMessages(): void {
    messagesDiv.innerHTML = "";
  }

  async function loadMessagesForChannel(channelId: number): Promise<void> {
    clearMessages();
    const controller = new AbortController();
    const timeoutId = MESSAGES_TIMEOUT_MS > 0 ? setTimeout(() => controller.abort(), MESSAGES_TIMEOUT_MS) : undefined;
    try {
      const response = await fetch(`${apiBase}/messages?channelId=${channelId}`, { signal: controller.signal });
      if (response.ok) {
        const data = (await response.json()) as {
          messages?: MessageData[];
        };
        if (data.messages) {
          data.messages.forEach((msg) => {
            displayMessage(msg);
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

  async function fetchMemberships(): Promise<void> {
    try {
      const response = await fetch(`${apiBase}/channels/memberships`);
      if (response.ok) {
        const data = (await response.json()) as { myChannels?: Channel[]; otherChannels?: Channel[] };
        const myChannels = data.myChannels || [];
        const otherChannels = data.otherChannels || [];
        allChannels = [...myChannels, ...otherChannels];
        myChannelIds.clear();
        for (const ch of myChannels) {
          myChannelIds.add(ch.id);
        }
      }
    } catch (error) {
      console.error("Error fetching memberships:", error);
    }
  }

  async function fetchChannelMembers(channelId: number): Promise<void> {
    try {
      const response = await fetch(`${apiBase}/channels/${channelId}/members`);
      if (response.ok) {
        const data = (await response.json()) as { members?: Member[] };
        currentMembers = data.members || [];
      } else {
        currentMembers = [];
      }
    } catch (error) {
      console.error("Error fetching channel members:", error);
      currentMembers = [];
    }
    renderMembersList();
  }

  function renderMembersList(): void {
    membersList.innerHTML = "";
    const sorted = [...currentMembers].sort((a, b) => {
      if (a.email === currentUserEmail) return -1;
      if (b.email === currentUserEmail) return 1;
      return a.name.localeCompare(b.name);
    });
    for (const member of sorted) {
      const li = document.createElement("li");
      const isDmClickable = member.email !== currentUserEmail && viewMode === "channel";
      li.className = `member-item${member.email === currentUserEmail ? " current-user" : ""}${isDmClickable ? " dm-clickable" : ""}`;
      li.textContent = member.name;
      if (isDmClickable) {
        li.title = `Message ${member.name}`;
        li.addEventListener("click", () => startDmWithUser(member.email));
      }
      membersList.appendChild(li);
    }
  }

  function renderChannelLists(): void {
    channelListEl.innerHTML = "";
    browseChannelListEl.innerHTML = "";

    const myChannels = allChannels.filter((ch) => myChannelIds.has(ch.id));
    const otherChannels = allChannels.filter((ch) => !myChannelIds.has(ch.id));

    for (const ch of myChannels) {
      const li = document.createElement("li");
      li.className = `channel-item${viewMode === "channel" && ch.id === activeChannelId ? " active" : ""}`;

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

  async function fetchDmConversations(): Promise<void> {
    try {
      const response = await fetch(`${apiBase}/dm/conversations`);
      if (response.ok) {
        const data = (await response.json()) as { conversations?: DmConversation[] };
        dmConversations = data.conversations || [];
      }
    } catch (error) {
      console.error("Error fetching DM conversations:", error);
    }
    renderDmList();
  }

  function renderDmList(): void {
    dmListEl.innerHTML = "";
    for (const conv of dmConversations) {
      const li = document.createElement("li");
      li.className = `dm-item${viewMode === "dm" && conv.id === activeDmConversationId ? " active" : ""}`;

      const nameSpan = document.createElement("span");
      nameSpan.className = "dm-item-name";
      nameSpan.textContent = conv.otherUserName;
      li.appendChild(nameSpan);

      li.addEventListener("click", () => switchToDm(conv.id, conv.otherUserName));
      dmListEl.appendChild(li);
    }
  }

  async function loadDmMessages(conversationId: number): Promise<void> {
    clearMessages();
    const controller = new AbortController();
    const timeoutId = MESSAGES_TIMEOUT_MS > 0 ? setTimeout(() => controller.abort(), MESSAGES_TIMEOUT_MS) : undefined;
    try {
      const response = await fetch(`${apiBase}/dm/conversations/${conversationId}/messages`, {
        signal: controller.signal,
      });
      if (response.ok) {
        const data = (await response.json()) as { messages?: MessageData[] };
        if (data.messages) {
          for (const msg of data.messages) {
            displayMessage(msg);
          }
        }
      } else {
        console.error("Failed to load DM messages:", response.status);
      }
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        console.info("Loading DM messages was aborted (timeout).");
        return;
      }
      console.error("Error loading DM messages:", error);
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  async function switchToDm(conversationId: number, otherUserName: string): Promise<void> {
    if (viewMode === "dm" && conversationId === activeDmConversationId) {
      if (isMobileView()) closeSidebar();
      return;
    }
    viewMode = "dm";
    activeDmConversationId = conversationId;
    channelNameHeader.textContent = otherUserName;
    membersPanel.classList.add("hidden");
    toggleMembersButton.classList.add("hidden");
    renderChannelLists();
    renderDmList();
    if (isMobileView()) closeSidebar();
    await loadDmMessages(conversationId);
    messageInput.focus();
  }

  function switchBackToChannel(): void {
    viewMode = "channel";
    activeDmConversationId = null;
    toggleMembersButton.classList.remove("hidden");
    if (membersPanelVisible) {
      membersPanel.classList.remove("hidden");
    }
    renderDmList();
  }

  async function openDmCompose(): Promise<void> {
    dmComposeModal.classList.remove("hidden");
    dmSearchInput.value = "";
    dmSearchInput.focus();

    try {
      const response = await fetch(`${apiBase}/dm/workspace-members`);
      if (response.ok) {
        const data = (await response.json()) as { members?: Member[] };
        allWorkspaceMembers = data.members || [];
      }
    } catch (error) {
      console.error("Error fetching workspace members for DM compose:", error);
    }

    renderDmMemberList("");
  }

  function closeDmCompose(): void {
    dmComposeModal.classList.add("hidden");
  }

  function renderDmMemberList(filter: string): void {
    dmMemberListEl.innerHTML = "";
    const lowerFilter = filter.toLowerCase();
    const filtered = allWorkspaceMembers.filter(
      (m) => m.name.toLowerCase().includes(lowerFilter) || m.email.toLowerCase().includes(lowerFilter),
    );

    for (const member of filtered) {
      const li = document.createElement("li");
      li.className = "dm-member-item";

      const nameSpan = document.createElement("span");
      nameSpan.className = "dm-member-item-name";
      nameSpan.textContent = member.name;
      li.appendChild(nameSpan);

      const emailSpan = document.createElement("span");
      emailSpan.className = "dm-member-item-email";
      emailSpan.textContent = member.email;
      li.appendChild(emailSpan);

      li.addEventListener("click", () => {
        closeDmCompose();
        startDmWithUser(member.email);
      });
      dmMemberListEl.appendChild(li);
    }
  }

  async function startDmWithUser(targetEmail: string): Promise<void> {
    try {
      const response = await fetch(`${apiBase}/dm/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetEmail }),
      });
      if (response.ok || response.status === 201) {
        const data = (await response.json()) as { conversation: DmConversation };
        const conv = data.conversation;

        const existingIndex = dmConversations.findIndex((c) => c.id === conv.id);
        if (existingIndex === -1) {
          dmConversations.unshift(conv);
        }

        await switchToDm(conv.id, conv.otherUserName);
      } else {
        const data = (await response.json()) as { error?: string };
        console.error("Error starting DM:", data.error);
      }
    } catch (error) {
      console.error("Error starting DM:", error);
    }
  }

  async function initChannels(): Promise<void> {
    await fetchMemberships();

    const generalChannel = allChannels.find((ch) => ch.name === "general");
    if (generalChannel && myChannelIds.has(generalChannel.id)) {
      activeChannelId = generalChannel.id;
      channelNameHeader.textContent = `#${generalChannel.name}`;
    } else if (myChannelIds.size > 0) {
      const firstJoined = allChannels.find((ch) => myChannelIds.has(ch.id));
      if (firstJoined) {
        activeChannelId = firstJoined.id;
        channelNameHeader.textContent = `#${firstJoined.name}`;
      }
    }

    renderChannelLists();
    await fetchDmConversations();

    if (activeChannelId) {
      await loadMessagesForChannel(activeChannelId);
      await fetchChannelMembers(activeChannelId);
    }
  }

  async function switchChannel(channelId: number, channelName: string): Promise<void> {
    if (viewMode === "channel" && channelId === activeChannelId) {
      if (isMobileView()) closeSidebar();
      return;
    }
    if (viewMode === "dm") {
      switchBackToChannel();
    }
    activeChannelId = channelId;
    channelNameHeader.textContent = `#${channelName}`;
    renderChannelLists();
    renderDmList();
    if (isMobileView()) closeSidebar();
    await loadMessagesForChannel(channelId);
    await fetchChannelMembers(channelId);
    messageInput.focus();
  }

  function notifyMembershipChange(type: "memberJoin" | "memberLeave", channelId: number): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, channelId, userEmail: currentUserEmail, userName: currentUserEmail }));
    }
  }

  async function joinChannel(channelId: number): Promise<void> {
    try {
      const response = await fetch(`${apiBase}/channels/${channelId}/join`, { method: "POST" });
      if (response.ok) {
        myChannelIds.add(channelId);
        notifyMembershipChange("memberJoin", channelId);
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
      const response = await fetch(`${apiBase}/channels/${channelId}/leave`, { method: "POST" });
      if (response.ok) {
        myChannelIds.delete(channelId);
        notifyMembershipChange("memberLeave", channelId);
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
      const response = await fetch(`${apiBase}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (response.ok) {
        const data = (await response.json()) as { channel: Channel };
        const newChannel: Channel = data.channel;
        allChannels.push(newChannel);
        myChannelIds.add(newChannel.id);
        renderChannelLists();
        await switchChannel(newChannel.id, newChannel.name);
      } else {
        const data = (await response.json()) as { error?: string };
        alert(data.error || "Failed to create channel");
      }
    } catch (error) {
      console.error("Error creating channel:", error);
    }
  }

  sidebarToggle.addEventListener("click", toggleSidebar);

  sidebarOverlay.addEventListener("click", closeSidebar);

  toggleMembersButton.addEventListener("click", () => {
    membersPanelVisible = !membersPanelVisible;
    if (membersPanelVisible) {
      membersPanel.classList.remove("hidden");
      toggleMembersButton.classList.add("active");
    } else {
      membersPanel.classList.add("hidden");
      toggleMembersButton.classList.remove("active");
    }
  });

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

  dmComposeButton.addEventListener("click", () => openDmCompose());

  dmSearchInput.addEventListener("input", () => {
    renderDmMemberList(dmSearchInput.value.trim());
  });

  dmComposeModal.addEventListener("click", (e: MouseEvent) => {
    if (e.target === dmComposeModal) {
      closeDmCompose();
    }
  });

  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (sidebar.classList.contains("open")) {
        closeSidebar();
      } else if (!dmComposeModal.classList.contains("hidden")) {
        closeDmCompose();
      } else if (workspaceModal.isModalVisible()) {
        workspaceModal.closeModal();
      } else if (!createChannelModal.classList.contains("hidden")) {
        createChannelModal.classList.add("hidden");
      }
    }
  });

  function cancelScheduledReconnect(): void {
    if (reconnectTimer !== undefined) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }
  }

  function scheduleReconnect(): void {
    cancelScheduledReconnect();
    statusDiv.textContent = `Reconnecting in ${reconnectDelay / 1000}s...`;
    statusDiv.className = `${STATUS_CLASS} ${RECONNECTING_CLASS}`;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      connect();
    }, reconnectDelay);

    reconnectDelay = Math.min(reconnectDelay * BACKOFF_MULTIPLIER, MAX_RECONNECT_DELAY_MS);
  }

  function reconnectNow(): void {
    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING ||
      ws.readyState === WebSocket.CLOSING
    ) {
      return;
    }
    cancelScheduledReconnect();
    reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
    connect();
  }

  function connect(): void {
    const socket = new WebSocket(wsUrl);
    ws = socket;

    socket.onopen = (_event: Event) => {
      if (ws !== socket) return;
      console.log("Connected to WebSocket");
      reconnectDelay = INITIAL_RECONNECT_DELAY_MS;
      statusDiv.textContent = "Connected";
      statusDiv.className = `${STATUS_CLASS} ${CONNECTED_CLASS}`;
      messageInput.disabled = false;
      sendButton.disabled = false;
      attachButton.disabled = false;
    };

    socket.onmessage = (event: MessageEvent) => {
      if (ws !== socket) return;
      try {
        const data = JSON.parse(event.data as string) as {
          type: string;
          channelId?: number;
          conversationId?: number;
          userName?: string;
          userEmail: string;
          content: string;
          attachmentKey?: string | null;
          attachmentName?: string | null;
          attachmentType?: string | null;
          attachmentSize?: number | null;
        };
        if (data.type === "message" && viewMode === "channel" && data.channelId === activeChannelId) {
          displayMessage(data);
        }
        if (data.type === "dm" && viewMode === "dm" && data.conversationId === activeDmConversationId) {
          displayMessage(data);
        }
        if (data.type === "dm") {
          const existingConv = dmConversations.find((c) => c.id === data.conversationId);
          if (!existingConv) {
            fetchDmConversations();
          }
        }
        if ((data.type === "memberJoin" || data.type === "memberLeave") && data.channelId === activeChannelId) {
          fetchChannelMembers(data.channelId);
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    socket.onclose = (event: CloseEvent) => {
      if (ws !== socket) return;
      console.log("Disconnected from WebSocket");
      messageInput.disabled = true;
      sendButton.disabled = true;
      attachButton.disabled = true;

      if (event.code === UNAUTHORIZED_CLOSE_CODE) {
        statusDiv.textContent = "Disconnected (unauthorized)";
        statusDiv.className = `${STATUS_CLASS} ${DISCONNECTED_CLASS}`;
        return;
      }

      scheduleReconnect();
    };

    socket.onerror = (error: Event) => {
      if (ws !== socket) return;
      console.error("WebSocket error:", error);
    };
  }

  let previewObjectUrl: string | null = null;

  function showAttachmentPreview(file: File): void {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = null;
    }
    attachmentPreview.innerHTML = "";
    attachmentPreview.classList.remove("hidden");

    if (file.type.startsWith("image/")) {
      const thumb = document.createElement("img");
      thumb.className = "attachment-preview-thumb";
      previewObjectUrl = URL.createObjectURL(file);
      thumb.src = previewObjectUrl;
      thumb.alt = file.name;
      attachmentPreview.appendChild(thumb);
    } else {
      const iconEl = document.createElement("div");
      iconEl.className = "attachment-preview-video-icon";
      iconEl.textContent = "\u25B6";
      attachmentPreview.appendChild(iconEl);
    }

    const nameEl = document.createElement("span");
    nameEl.className = "attachment-preview-name";
    nameEl.textContent = file.name;
    attachmentPreview.appendChild(nameEl);

    const sizeEl = document.createElement("span");
    sizeEl.className = "attachment-preview-size";
    sizeEl.textContent = formatFileSize(file.size);
    attachmentPreview.appendChild(sizeEl);

    const removeBtn = document.createElement("button");
    removeBtn.className = "attachment-preview-remove";
    removeBtn.textContent = "\u00D7";
    removeBtn.type = "button";
    removeBtn.addEventListener("click", clearPendingFile);
    attachmentPreview.appendChild(removeBtn);
  }

  function clearPendingFile(): void {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = null;
    }
    pendingFile = null;
    fileInput.value = "";
    attachmentPreview.innerHTML = "";
    attachmentPreview.classList.add("hidden");
  }

  function handleFileSelect(): void {
    const file = fileInput.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.has(file.type)) {
      alert("File type not allowed. Supported: JPEG, PNG, GIF, WebP, MP4, WebM");
      fileInput.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      alert("File too large. Maximum size is 25 MB.");
      fileInput.value = "";
      return;
    }

    pendingFile = file;
    showAttachmentPreview(file);
  }

  async function uploadFile(file: File): Promise<{ key: string; name: string; type: string; size: number } | null> {
    const formData = new FormData();
    formData.append("file", file);
    if (viewMode === "dm" && activeDmConversationId !== null) {
      formData.append("conversationId", String(activeDmConversationId));
    } else {
      formData.append("channelId", String(activeChannelId));
    }

    try {
      const response = await fetch(`${apiBase}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        console.error("Upload failed:", errorData.error);
        return null;
      }

      return (await response.json()) as { key: string; name: string; type: string; size: number };
    } catch (error) {
      console.error("Error uploading file:", error);
      return null;
    }
  }

  async function sendMessage(): Promise<void> {
    const message = messageInput.value.trim();
    const hasMessage = Boolean(message);
    const hasFile = Boolean(pendingFile);

    if (!hasMessage && !hasFile) return;
    if (ws.readyState !== WebSocket.OPEN) return;

    if (viewMode === "channel" && activeChannelId === null) return;
    if (viewMode === "dm" && activeDmConversationId === null) return;

    if (isUploading) return;

    const wsPayload: Record<string, unknown> =
      viewMode === "channel"
        ? { type: "message", channelId: activeChannelId, content: message }
        : { type: "dm", conversationId: activeDmConversationId, content: message };

    if (hasFile && pendingFile) {
      isUploading = true;
      sendButton.disabled = true;
      attachButton.disabled = true;
      sendButton.textContent = "Uploading...";

      const result = await uploadFile(pendingFile);

      isUploading = false;
      sendButton.disabled = false;
      attachButton.disabled = false;
      sendButton.textContent = "Send";

      if (!result) {
        alert("Failed to upload file. Please try again.");
        return;
      }

      wsPayload.attachmentKey = result.key;
      wsPayload.attachmentName = result.name;
      wsPayload.attachmentType = result.type;
      wsPayload.attachmentSize = result.size;
      clearPendingFile();
    }

    ws.send(JSON.stringify(wsPayload));
    messageInput.value = "";
  }

  sendButton.addEventListener("click", () => sendMessage());
  messageInput.addEventListener("keypress", (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  attachButton.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleFileSelect);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      reconnectNow();
    }
  });

  window.addEventListener("online", () => {
    reconnectNow();
  });

  connect();

  window.addEventListener("load", () => {
    detectCurrentUserEmail();
    if (isTabletView()) {
      membersPanelVisible = false;
      membersPanel.classList.add("hidden");
      toggleMembersButton.classList.remove("active");
      toggleMembersButton.setAttribute("aria-expanded", "false");
    } else {
      toggleMembersButton.classList.add("active");
    }
    messageInput.focus();
    initChannels();
  });
})();
