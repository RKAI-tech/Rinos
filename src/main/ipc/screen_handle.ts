import { BrowserWindow, ipcMain } from "electron";
import { createRecorderWindow } from "../windowManager.js";
import { BrowserManager } from "../../browser/BrowserManager.js";

let recorderWin: BrowserWindow | null = null;
let browserManager: BrowserManager | null = null;

// Function to set browser manager reference
export function setBrowserManager(bm: BrowserManager) {
  browserManager = bm;
  console.log('[Screen Handle] Browser manager reference set');
}

// Function to stop browser
async function stopBrowser() {
  try {
    console.log('[Screen Handle] Stopping browser');
    
    if (browserManager) {
      console.log('[Screen Handle] Calling browserManager.stop()');
      await browserManager.stop();
      console.log('[Screen Handle] Browser stopped successfully');
    } else {
      console.log('[Screen Handle] No browser manager reference available');
    }
  } catch (error) {
    console.error('[Screen Handle] Error stopping browser:', error);
  }
}

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
      win.on("closed", async () => {
        // Close browser when recorder window is closed
        await stopBrowser();
        
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
  ipcMain.handle("screen:close_recorder", async () => {
    try {
      // Close browser first if it's running
      await stopBrowser();

      // Then close recorder window
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


