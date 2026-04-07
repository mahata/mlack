import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("mlackDesktop", {
  showNotification: (title: string, body: string, channelId?: number) => {
    ipcRenderer.send("show-notification", { title, body, channelId });
  },
  onNotificationClicked: (callback: (channelId: number) => void) => {
    const notificationClickedListener = (_event: Electron.IpcRendererEvent, channelId: number) => {
      callback(channelId);
    };

    ipcRenderer.on("notification-clicked", notificationClickedListener);

    return () => {
      ipcRenderer.removeListener("notification-clicked", notificationClickedListener);
    };
  },
  isDesktopApp: true,
});
