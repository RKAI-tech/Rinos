import { BrowserWindow, ipcMain } from "electron";
import { createRecorderWindow } from "../windowManager.js";
import { BrowserManager } from "../../browser/BrowserManager.js";

// Giữ API để file khác có thể set nếu cần, nhưng không còn dùng để stop theo cửa sổ
let _lastBrowserManagerRef: BrowserManager | null = null;
export function setBrowserManager(bm: BrowserManager) {
  _lastBrowserManagerRef = bm;
}

// Map testcaseId -> BrowserWindow để tránh mở trùng và có thể focus lại
const testcaseIdToWindow = new Map<string, BrowserWindow>();

export function registerScreenHandlersIpc() {
  // Open (or focus) the recorder window
  ipcMain.handle("screen:open_recorder", (_evt, testcaseId?: string, projectId?: string, testcaseName?: string, browserType?: string, testSuiteId?: string, evidenceId?: string) => {
    try {
      const key = testcaseId || '';
      const existing = key ? testcaseIdToWindow.get(key) : undefined;
      if (existing && !existing.isDestroyed()) {
        try { existing.focus(); } catch {}
        return { success: true, created: false, alreadyOpen: true, testcaseId };
      }

      /* console.log('[Screen Handle] TestSuite ID', testSuiteId); */
      /* console.log('[Screen Handle] Evidence ID', evidenceId); */
      
      const win: BrowserWindow = createRecorderWindow(testcaseId, projectId, testcaseName, browserType, testSuiteId, evidenceId);
      if (key) testcaseIdToWindow.set(key, win);
      if (testcaseId) {
        try { win.setTitle(`Recorder`); } catch {}
      }
      win.on("closed", () => {
        if (key) testcaseIdToWindow.delete(key);
        // Không gọi stopBrowser ở đây; mỗi BrowserManager đã tự gắn theo BrowserWindow trong module browser IPC

        BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
          if (!window.isDestroyed()) {
            window.webContents.send('recorder:closed');
          }
        });
      });
      return { success: true, created: true, alreadyOpen: false, testcaseId };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  });

  // Close recorder window (giữ nguyên hành vi cũ nếu có nơi gọi, không ép stop browser ở đây)
  ipcMain.handle("screen:close_recorder", async () => {
    try {
      // Không tự động stop browser ở đây để tránh đóng nhầm phiên
      // Tùy vào nơi gọi close cụ thể, có thể mở rộng nhận testcaseId để đóng đúng cửa sổ
      let closed = false;
      for (const [key, win] of testcaseIdToWindow.entries()) {
        if (win && !win.isDestroyed()) {
          win.close();
          testcaseIdToWindow.delete(key);
          closed = true;
          break;
        }
      }
      return { success: true, closed };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  });
}


