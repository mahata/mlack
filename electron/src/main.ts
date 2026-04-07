import { app, BrowserWindow, shell } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTray, destroyTray } from "./tray.js";
import { setupNotifications } from "./notifications.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IS_DEV = process.argv.includes("--dev");
const APP_URL = IS_DEV ? "http://localhost:8787" : "https://mlack.uk";

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, "preload.js");

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 500,
    title: "MLack",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadURL(APP_URL);

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (IS_DEV) {
    win.webContents.openDevTools({ mode: "detach" });
  }

  win.on("closed", () => {
    mainWindow = null;
  });

  return win;
}

app.whenReady().then(() => {
  mainWindow = createWindow();
  createTray(mainWindow);
  setupNotifications(mainWindow);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      createTray(mainWindow);
      setupNotifications(mainWindow);
    } else {
      mainWindow?.show();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    destroyTray();
    app.quit();
  }
});
