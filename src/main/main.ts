import { app, BrowserWindow, globalShortcut, Menu } from "electron";
import { createMainAppWindow } from "./windowManager.js";
import { registerIpcHandlers } from "./ipc/index.js";
import { registerMicrosoftLoginIpc } from "./ipc/microsoftLogin.js";
import { registerTokenIpc } from "./ipc/token.js";
import { registerEncryptionIpc } from "./ipc/encryption.js";
import { registerScreenHandlersIpc } from "./ipc/screen_handle.js";
import { registerBrowserIpc } from "./ipc/browser.js";
import { registerPlaywrightHandlersIpc } from "./ipc/playwright.js";
import "./env.js"; // Load environment variables

// Disable Chromium/Electron sandbox in environments where SUID sandbox is unavailable (e.g., AppImage mount)
app.commandLine.appendSwitch("no-sandbox");
app.commandLine.appendSwitch("disable-setuid-sandbox");
app.commandLine.appendSwitch("disable-gpu-sandbox");
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-dev-shm-usage");
app.commandLine.appendSwitch("no-zygote");

// browserWindow() => BrowserWindow
app.whenReady().then(() => {
  try {
    Menu.setApplicationMenu(null);
  } catch {}
  
  registerIpcHandlers();
  registerTokenIpc();
  registerEncryptionIpc();
  registerMicrosoftLoginIpc();
  registerBrowserIpc(); // Register browser IPC first
  registerScreenHandlersIpc(); // Then register screen handlers
  registerPlaywrightHandlersIpc(); // Register playwright IPC
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
    // console.error("Error registering global shortcut:", e);
  }
  
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainAppWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
