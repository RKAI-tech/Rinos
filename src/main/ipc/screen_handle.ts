import { BrowserWindow, ipcMain } from "electron";
import { createRecorderWindow } from "../windowManager.js";

let recorderWin: BrowserWindow | null = null;

export function registerScreenHandlersIpc() {
  // Open (or focus) the recorder window
  ipcMain.handle("screen:open_recorder", (_evt, testcaseId?: string, projectId?: string) => {
    try {
        console.log('[Screen Handle] Opening recorder for testcase:', testcaseId, 'and project:', projectId);
      // Always open a new recorder window for a testcase
      const win: BrowserWindow = createRecorderWindow(testcaseId, projectId);
      if (testcaseId) {
        try { win.setTitle(`Recorder`); } catch {}
        console.log('[Screen Handle] Set title to:', `Recorder - TC: ${testcaseId} - Project: ${projectId}`);
      }
      win.on("closed", () => {
        // keep last reference for close_recorder if needed
        if (recorderWin === win) recorderWin = null;
      });
      recorderWin = win;
      return { success: true, created: true, testcaseId };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  });

  // Close recorder window
  ipcMain.handle("screen:close_recorder", () => {
    try {
      if (recorderWin && !recorderWin.isDestroyed()) {
        recorderWin.close();
        recorderWin = null;
        return { success: true, closed: true };
      }
      return { success: true, closed: false };
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  });
}


