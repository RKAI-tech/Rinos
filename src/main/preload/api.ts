import { contextBridge, ipcRenderer } from "electron";

// Window management API
const windowAPI = {
  openRecorder: () => ipcRenderer.invoke("open-recorder"),
  closeAllWindows: (options?: { preserveSender?: boolean }) => ipcRenderer.invoke("close-all-windows", options),
  minimizeWindow: () => ipcRenderer.invoke("minimize-window"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("toggle-maximize-window"),
  confirmCloseRecorder: (confirmed: boolean) => ipcRenderer.invoke("confirm-close-recorder", confirmed),
  sendMainAppCloseResult: (data: { confirm: boolean, save: boolean }) => ipcRenderer.send('mainapp:close-result', data),
  onRecorderCloseRequested: (callback: () => void) => {
    ipcRenderer.on('recorder:close-requested', callback);
    return () => ipcRenderer.removeListener('recorder:close-requested', callback);
  },
  onMainAppCloseRequested: (callback: () => void) => {
    ipcRenderer.on('mainapp:close-requested', callback);
    return () => ipcRenderer.removeListener('mainapp:close-requested', callback);
  },
  onChildWindowForceSaveAndClose: (callback: () => void) => {
    ipcRenderer.on('window:force-save-and-close', callback);
    return () => ipcRenderer.removeListener('window:force-save-and-close', callback);
  },
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
