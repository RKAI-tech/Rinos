import { contextBridge, ipcRenderer } from "electron";

// Expose Microsoft-specific APIs under a separate namespace
export function exposeScreenHandleAPI() {
  contextBridge.exposeInMainWorld("screenHandleAPI", {
    openRecorder: (
      testcaseId?: string, 
      projectId?: string, 
      testcaseName?: string, 
      browserType?: string, 
      testSuiteId?: string, 
      evidenceId?: string
    ) => {
      console.log('[Screen Handle] openRecorder evidenceId', evidenceId);
      return ipcRenderer.invoke("screen:open_recorder", testcaseId, projectId, testcaseName, browserType, testSuiteId, evidenceId);
    },
    closeRecorder: () => ipcRenderer.invoke("screen:close_recorder"),
    onRecorderClosed: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('recorder:closed', listener);
      return () => ipcRenderer.removeListener('recorder:closed', listener);
    },
  });
}

