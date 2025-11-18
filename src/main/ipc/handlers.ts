import { ipcMain, BrowserWindow, shell, app } from "electron";
import { registerTokenIpc } from "./token.js";
import { createRecorderWindow } from "../windowManager.js";

// Đăng ký tất cả IPC handlers
export function registerIpcHandlers() {
  // Microsoft login

  // Handler để mở cửa sổ recorder
  ipcMain.handle("open-recorder", (_evt, testcaseId?: string) => {
    createRecorderWindow(testcaseId);
  });

  // Handler để lấy thông tin app
  ipcMain.handle("get-app-info", () => {
    return {
      platform: process.platform,
      versions: process.versions,
      isDev: !process.env.NODE_ENV || process.env.NODE_ENV === "development",
      appVersion: app.getVersion()
    };
  });

  // Handler để đóng tất cả cửa sổ
  ipcMain.handle(
    "close-all-windows",
    (event, options?: { preserveSender?: boolean }) => {
      const senderId = options?.preserveSender ? event.sender.id : undefined;

      BrowserWindow.getAllWindows().forEach((window) => {
        if (options?.preserveSender && window.webContents.id === senderId) {
          return;
        }
        if (!window.isDestroyed()) {
          window.close();
        }
      });
    }
  );

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

  // Handler để xác nhận đóng cửa sổ recorder
  ipcMain.handle("confirm-close-recorder", (event, confirmed: boolean) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window && !window.isDestroyed()) {
      if (confirmed) {
        // Nếu người dùng xác nhận đóng, đóng cửa sổ
        window.destroy();
      }
      // Nếu không xác nhận, không làm gì (cửa sổ vẫn mở)
    }
  });

  // Handler để mở URL bên ngoài trong browser
  ipcMain.handle('open-external-url', async (_event, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      console.error('Failed to open external URL:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });
}
