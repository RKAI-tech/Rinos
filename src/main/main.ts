import { app, BrowserWindow, globalShortcut, Menu } from "electron";
import { createMainAppWindow } from "./windowManager.js";
import { registerIpcHandlers } from "./ipc/index.js";
import { registerMicrosoftLoginIpc } from "./ipc/microsoftLogin.js";
import { registerTokenIpc } from "./ipc/token.js";
import { registerScreenHandlersIpc } from "./ipc/screen_handle.js";
import { registerBrowserIpc } from "./ipc/browser.js";

// browserWindow() => BrowserWindow

app.whenReady().then(() => {
  try {
    Menu.setApplicationMenu(null);
  } catch {}
  registerIpcHandlers();
  registerTokenIpc();
  registerMicrosoftLoginIpc();
  registerBrowserIpc(); // Register browser IPC first
  registerScreenHandlersIpc(); // Then register screen handlers
  createMainAppWindow();

  try {
    globalShortcut.register("F11", () => {
      const wins = BrowserWindow.getAllWindows();
      wins.forEach((win: BrowserWindow) => {
        if (win && !win.isDestroyed()) {
          win.setFullScreen(!win.isFullScreen());
        }
      });
    });
  } catch (e) {
    console.error("Error registering global shortcut:", e);
  }
  
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainAppWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
