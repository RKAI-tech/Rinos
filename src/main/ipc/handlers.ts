import { ipcMain, BrowserWindow, shell, app } from "electron";
import { registerTokenIpc } from "./token.js";
import { createRecorderWindow } from "../windowManager.js";
import * as fs from "fs";
import * as path from "path";

/**
 * Helper function to extract base64 content from data URL
 * If input is a data URL (data:text/plain;base64,xxx), extract the base64 part
 * Otherwise, return the input as is
 */
function extractBase64FromDataURL(dataURL: string): string {
  if (dataURL && typeof dataURL === 'string' && dataURL.startsWith('data:')) {
    const commaIndex = dataURL.indexOf(',');
    if (commaIndex !== -1) {
      return dataURL.substring(commaIndex + 1);
    }
  }
  return dataURL || '';
}

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

  // File system handlers for test execution
  ipcMain.handle('fs:write-file', async (_event, filePath: string, content: string, encoding?: string) => {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
      // Ensure directory exists
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // If encoding is 'base64', decode it before writing
      if (encoding === 'base64') {
        // Extract base64 from data URL if needed
        const base64Content = extractBase64FromDataURL(content);
        fs.writeFileSync(fullPath, Buffer.from(base64Content, 'base64'));
      } else {
        fs.writeFileSync(fullPath, content, { encoding: encoding as BufferEncoding || 'utf-8' });
            }
      return { success: true };
    } catch (error) {
      console.error('Failed to write file:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) {
        return { success: false, error: 'File not found' };
      }
      const data = fs.readFileSync(fullPath);
      // Return as base64 for easier transfer
      const base64 = data.toString('base64');
      // Try to detect mime type from extension
      const ext = path.extname(fullPath).toLowerCase();
      const mimeTypes: { [key: string]: string } = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.webm': 'video/webm',
        '.mp4': 'video/mp4',
        '.txt': 'text/plain',
        '.log': 'text/plain',
      };
      return { 
        success: true, 
        data: base64,
        mimeType: mimeTypes[ext] || 'application/octet-stream'
      };
    } catch (error) {
      console.error('Failed to read file:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  ipcMain.handle('fs:delete-file', async (_event, filePath: string) => {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to delete file:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  ipcMain.handle('fs:delete-directory', async (_event, dirPath: string) => {
    try {
      const fullPath = path.isAbsolute(dirPath) ? dirPath : path.resolve(process.cwd(), dirPath);
      if (fs.existsSync(fullPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to delete directory:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  });

  ipcMain.handle('fs:find-files', async (_event, dirPath: string, extensions: string[]) => {
    try {
      const fullPath = path.isAbsolute(dirPath) ? dirPath : path.resolve(process.cwd(), dirPath);
      if (!fs.existsSync(fullPath)) {
        return { success: true, files: [] };
      }
      
      const files: string[] = [];
      const findFilesRecursive = (dir: string) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullEntryPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            findFilesRecursive(fullEntryPath);
          } else if (entry.isFile()) {
            const ext = path.extname(entry.name).toLowerCase();
            if (extensions.includes(ext)) {
              files.push(fullEntryPath);
            }
          }
        }
      };
      
      findFilesRecursive(fullPath);
      
      // Sort by modification time (newest first)
      files.sort((a, b) => {
        const statA = fs.statSync(a);
        const statB = fs.statSync(b);
        return statB.mtime.getTime() - statA.mtime.getTime();
      });
      
      return { success: true, files };
    } catch (error) {
      console.error('Failed to find files:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        files: []
      };
    }
  });
}
