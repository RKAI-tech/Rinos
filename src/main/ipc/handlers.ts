import { ipcMain, BrowserWindow } from "electron";
import { registerTokenIpc } from "./token.js";
import { createRecorderWindow } from "../windowManager.js";

// Đăng ký tất cả IPC handlers
export function registerIpcHandlers() {
  // Microsoft login

  // Handler để mở cửa sổ recorder
  ipcMain.handle("open-recorder", () => {
    createRecorderWindow();
  });

  // Handler để lấy thông tin app
  ipcMain.handle("get-app-info", () => {
    return {
      platform: process.platform,
      versions: process.versions,
      isDev: !process.env.NODE_ENV || process.env.NODE_ENV === "development"
    };
  });

  // Handler để đóng tất cả cửa sổ
  ipcMain.handle("close-all-windows", () => {
    BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
      if (!window.isDestroyed()) {
        window.close();
      }
    });
  });

  // Handler để minimize window
  ipcMain.handle("minimize-window", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window && !window.isDestroyed()) {
      window.minimize();
    }
  });

  // Handler để maximize/restore window
  ipcMain.handle("toggle-maximize-window", (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window && !window.isDestroyed()) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  });
}
