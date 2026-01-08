import { contextBridge, ipcRenderer } from "electron";

// Window management API
const windowAPI = {
  openRecorder: () => ipcRenderer.invoke("open-recorder"),
  closeAllWindows: (options?: { preserveSender?: boolean }) => ipcRenderer.invoke("close-all-windows", options),
  minimizeWindow: () => ipcRenderer.invoke("minimize-window"),
  toggleMaximizeWindow: () => ipcRenderer.invoke("toggle-maximize-window"),
  confirmCloseRecorder: (confirmed: boolean) => ipcRenderer.invoke("confirm-close-recorder", confirmed),
  sendMainAppCloseResult: (data: { confirm: boolean, save: boolean }) => ipcRenderer.send('mainapp:close-result', data),
  // Method để main window gọi để lấy unsaved flags từ child windows
  getUnsavedDatasFlag: () => ipcRenderer.invoke('mainapp:get-unsaved-datas-flag'),
  // Listener cho child window để nhận request và gửi response
  onGetUnsavedDatasFlag: (callback: (requestId: string) => void) => {
    const handler = (_event: any, requestId: string) => {
      callback(requestId);
    };
    ipcRenderer.on('window:get-unsaved-datas-flag', handler);
    return () => ipcRenderer.removeListener('window:get-unsaved-datas-flag', handler);
  },
  // Method để child window gửi response về main process
  sendUnsavedDatasResponse: (requestId: string, hasUnsaved: boolean) => {
    ipcRenderer.send('window:unsaved-datas-response', { requestId, hasUnsaved });
  },
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
  openExternalUrl: (url: string) => ipcRenderer.invoke('open-external-url', url),
};

// Playwright API
const playwrightAPI = {
  checkBrowsers: (browserTypes: string[]) => ipcRenderer.invoke('playwright:check-browsers', browserTypes),
  installBrowsers: (browsers: string[]) => ipcRenderer.invoke('playwright:install-browsers', browsers),
  getBrowsersInfo: () => ipcRenderer.invoke('playwright:get-browsers-info'),
  removeBrowser: (browserType: string) => ipcRenderer.invoke('playwright:remove-browser', browserType),
  runTest: (options: { scriptPath: string; browserType: string; outputDir: string; timeout?: number }) => 
    ipcRenderer.invoke('playwright:run-test', options),
  onInstallProgress: (callback: (progress: { browser: string; progress: number; status: string }) => void) => {
    const handler = (_event: any, progress: { browser: string; progress: number; status: string }) => {
      callback(progress);
    };
    ipcRenderer.on('playwright:install-progress', handler);
    return () => ipcRenderer.removeListener('playwright:install-progress', handler);
  },
};

// File system API
const fsAPI = {
  writeFile: (filePath: string, content: string, encoding?: string) => ipcRenderer.invoke('fs:write-file', filePath, content, encoding),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
  deleteFile: (filePath: string) => ipcRenderer.invoke('fs:delete-file', filePath),
  deleteDirectory: (dirPath: string) => ipcRenderer.invoke('fs:delete-directory', dirPath),
  findFiles: (dirPath: string, extensions: string[]) => ipcRenderer.invoke('fs:find-files', dirPath, extensions),
};

// Database API
const databaseAPI = {
  testConnection: (params: {
    db_type: 'postgres' | 'mysql' | 'mssql';
    host: string;
    port: number;
    db_name: string;
    username: string;
    password: string;
  }) => ipcRenderer.invoke('database:test-connection', params),
  executeQuery: (params: {
    db_type: 'postgres' | 'mysql' | 'mssql';
    host: string;
    port: number;
    db_name: string;
    username: string;
    password: string;
  }, query: string) => ipcRenderer.invoke('database:execute-query', params, query),
};

// Expose APIs to renderer
export function exposeAPIs() {
  contextBridge.exposeInMainWorld("electronAPI", {
    window: windowAPI,
    app: appAPI,
    system: systemAPI,
    playwright: playwrightAPI,
    fs: fsAPI,
    database: databaseAPI,
  });

  // Legacy support (giữ lại để tương thích)
  contextBridge.exposeInMainWorld("appInfo", systemAPI);
  contextBridge.exposeInMainWorld("playwrightAPI", playwrightAPI);
}
