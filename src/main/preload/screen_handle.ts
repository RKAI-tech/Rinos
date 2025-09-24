import { contextBridge, ipcRenderer } from "electron";

// Expose Microsoft-specific APIs under a separate namespace
export function exposeScreenHandleAPI() {
  contextBridge.exposeInMainWorld("screenHandleAPI", {
    openRecorder: () => ipcRenderer.invoke("screen:open_recorder"),
    closeRecorder: () => ipcRenderer.invoke("screen:close_recorder"),
  });
}

