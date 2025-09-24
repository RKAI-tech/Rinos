import { app, BrowserWindow, Menu } from "electron";
import { createMainAppWindow } from "./windowManager.js";
import { registerIpcHandlers } from "./ipc/index.js";
import { registerMicrosoftLoginIpc } from "./ipc/microsoftLogin.js";
import { registerTokenIpc } from "./ipc/token.js";
import { registerScreenHandlersIpc } from "./ipc/screen_handle.js";
app.whenReady().then(() => {
  try {
    Menu.setApplicationMenu(null);
  } catch {}
  registerIpcHandlers();
  registerTokenIpc();
  registerMicrosoftLoginIpc();
  registerScreenHandlersIpc();
  createMainAppWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainAppWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
