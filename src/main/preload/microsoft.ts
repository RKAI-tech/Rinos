import { contextBridge, ipcRenderer } from "electron";

// Expose Microsoft-specific APIs under a separate namespace
export function exposeMicrosoftAPI() {
  contextBridge.exposeInMainWorld("microsoftAPI", {
    login: () => ipcRenderer.invoke("auth:microsoft-login"),
  });
}


