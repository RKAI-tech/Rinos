import { contextBridge, ipcRenderer } from "electron";

// Window management API
const windowAPI = {
  openRecorder: () => ipcRenderer.invoke("open-recorder"),
  closeAllWindows: () => ipcRenderer.invoke("close-all-windows"),
  minimizeWindow: () => ipcRenderer.invoke("minimize-window"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("toggle-maximize-window"),
};

// App info API
const appAPI = {
  getAppInfo: () => ipcRenderer.invoke("get-app-info"),
};

// System API
const systemAPI = {
  platform: process.platform,
  versions: process.versions,
};

// Expose APIs to renderer
export function exposeAPIs() {
  contextBridge.exposeInMainWorld("electronAPI", {
    window: windowAPI,
    app: appAPI,
    system: systemAPI,
  });

  // Legacy support (giữ lại để tương thích)
  contextBridge.exposeInMainWorld("appInfo", systemAPI);
}
