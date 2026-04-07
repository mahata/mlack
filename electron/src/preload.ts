import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("mlackDesktop", {
  showNotification: (title: string, body: string, channelId?: number) => {
    ipcRenderer.send("show-notification", { title, body, channelId });
  },
  onNotificationClicked: (callback: (channelId: number) => void) => {
    ipcRenderer.on("notification-clicked", (_event, channelId: number) => {
      callback(channelId);
    });
  },
  isDesktopApp: true,
});
