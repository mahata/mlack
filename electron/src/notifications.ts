import { Notification, ipcMain } from "electron";
import type { BrowserWindow } from "electron";

let notificationWindow: BrowserWindow | null = null;
let hasRegisteredShowNotificationListener = false;

export function setupNotifications(mainWindow: BrowserWindow): void {
  notificationWindow = mainWindow;

  if (!hasRegisteredShowNotificationListener) {
    ipcMain.on("show-notification", (_event, data: { title: string; body: string; channelId?: number }) => {
      const currentWindow = notificationWindow;

      if (!currentWindow || currentWindow.isFocused()) {
        return;
      }

      const notification = new Notification({
        title: data.title,
        body: data.body,
        silent: false,
      });

      notification.on("click", () => {
        currentWindow.show();
        currentWindow.focus();
        if (data.channelId !== undefined) {
          currentWindow.webContents.send("notification-clicked", data.channelId);
        }
      });

      notification.show();
    });

    hasRegisteredShowNotificationListener = true;
  }

  mainWindow.webContents.on("did-finish-load", () => {
    mainWindow.webContents.executeJavaScript(`
      (function() {
        if (!window.__mlackNotificationHooked) {
          window.__mlackNotificationHooked = true;

          const origWebSocket = window.WebSocket;
          const origAddEventListener = EventTarget.prototype.addEventListener;

          origAddEventListener.call(document, 'mlack-ws-message', function(e) {
            const data = e.detail;
            if (data && data.type === 'message' && window.mlackDesktop) {
              const senderName = data.userName || data.userEmail || 'Someone';
              window.mlackDesktop.showNotification(
                'New message in #' + (data.channelName || 'channel'),
                senderName + ': ' + data.content,
                data.channelId
              );
            }
          });

          const OrigWebSocket = window.WebSocket;
          window.WebSocket = function(url, protocols) {
            const ws = protocols ? new OrigWebSocket(url, protocols) : new OrigWebSocket(url);

            ws.addEventListener('message', function(event) {
              try {
                const data = JSON.parse(event.data);
                document.dispatchEvent(new CustomEvent('mlack-ws-message', { detail: data }));
              } catch {}
            });

            return ws;
          };
          window.WebSocket.prototype = OrigWebSocket.prototype;
          window.WebSocket.CONNECTING = OrigWebSocket.CONNECTING;
          window.WebSocket.OPEN = OrigWebSocket.OPEN;
          window.WebSocket.CLOSING = OrigWebSocket.CLOSING;
          window.WebSocket.CLOSED = OrigWebSocket.CLOSED;
        }
      })();
    `);
  });
}
