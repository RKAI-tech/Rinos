import { BrowserWindow, app, ipcMain, screen } from "electron";
import { MainEnv } from "./env.js";
import path from "path";

const isDev = true; 
const __dirnameResolved = __dirname;
const iconFileNamePng="images/icon.png";
const iconFileNameIco="images/icon.ico";
const resolveIconPath = () => {
  if (process.platform === 'win32') {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, path.basename(iconFileNameIco));
    }
    return path.join(process.cwd(), iconFileNameIco);
  }
  if (app.isPackaged) {
    return path.join(process.resourcesPath, iconFileNamePng);
  }
  return path.join(process.cwd(), iconFileNamePng);
};

async function tryLoadDevPaths(win: BrowserWindow, page: string) {
  const candidates = [
    `${MainEnv.API_URL}/${page}/index.html`,
    `${MainEnv.API_URL}/${page}.html`,
    `${MainEnv.API_URL}/index.html`,
    `${MainEnv.API_URL}/`,
  ];
  for (const url of candidates) {
    try {
      await win.loadURL(url);
      return;
    } catch (err) {
    }
  }
  throw new Error("Cannot load renderer page from Vite. Check vite.config and path.");
}

function createWindow(options: Electron.BrowserWindowConstructorOptions, page: string) {

  const win = new BrowserWindow({
    ...options,
    icon: resolveIconPath(),
    webPreferences: {
      preload: path.join(__dirnameResolved, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },

  });

  if (isDev) {
    console.log('[windowManager] in dev mode');
    // Open dev tools after window is ready
    win.webContents.once('did-finish-load', () => {
      console.log('[windowManager] openDevTools - after did-finish-load');
      // Add small delay to ensure renderer is fully ready
      setTimeout(() => {
        try {
          if (!win.webContents.isDevToolsOpened()) {
            win.webContents.openDevTools();
          }
        } catch (err) {
          console.error('[windowManager] Error opening dev tools:', err);
        }
      }, 100);
    });
    
    // Fallback: if did-finish-load doesn't fire, try with ready-to-show
    win.once('ready-to-show', () => {
      console.log('[windowManager] ready-to-show');
      setTimeout(() => {
        if (!win.webContents.isDevToolsOpened()) {
          try {
            win.webContents.openDevTools();
          } catch (err) {
            console.error('[windowManager] Error opening dev tools (fallback):', err);
          }
        }
      }, 200);
    });
    
    tryLoadDevPaths(win, page).catch((err) => {
      console.error('[windowManager] Error loading dev paths:', err);
    });
  } else {
    console.log('[windowManager] in prod mode');
    win.loadFile(path.join(__dirnameResolved, `renderer/${page}/index.html`));
  }
  
  return win;
}

let mainAppWindow: BrowserWindow | null = null;
let childWindows: BrowserWindow[] = [];

export function createMainAppWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainAppWindow = createWindow({ width, height }, "main_app");

  mainAppWindow.on('close', (event) => {
    event.preventDefault();
    mainAppWindow?.webContents.send('mainapp:close-requested');
  });

  // Handler to get unsaved flags from all child windows
  ipcMain.handle('mainapp:get-unsaved-datas-flag', async () => {
    // console.log('[windowManager] Getting unsaved datas flag, childWindows count:', childWindows.length);
    if (!mainAppWindow || childWindows.length === 0) {
      // console.log('[windowManager] No child windows, returning false');
      return false;
    }

    const validWindows = childWindows.filter(win => win && !win.isDestroyed());
    // console.log('[windowManager] Valid child windows:', validWindows.length);

    const promises = validWindows.map(win => 
      new Promise<boolean>((resolve) => {
        const requestId = `unsaved-check-${win.webContents.id}-${Date.now()}-${Math.random()}`;
        // console.log('[windowManager] Sending request to child window:', requestId);
        
        // Listen to response with requestId to match
        const responseHandler = (_event: any, data: { requestId: string, hasUnsaved: boolean }) => {
          // console.log('[windowManager] Received response:', data);
          if (data.requestId === requestId) {
            ipcMain.removeListener('window:unsaved-datas-response', responseHandler);
            // console.log('[windowManager] Matched response, hasUnsaved:', data.hasUnsaved);
            resolve(data.hasUnsaved);
          }
        };
        
        ipcMain.on('window:unsaved-datas-response', responseHandler);
        
        // Send request with requestId
        win.webContents.send('window:get-unsaved-datas-flag', requestId);
        
        // Timeout to avoid hanging if child window does not respond
        setTimeout(() => {
          ipcMain.removeListener('window:unsaved-datas-response', responseHandler);
          // console.log('[windowManager] Timeout waiting for response from child window:', requestId);
          resolve(false);
        }, 2000); // Increase timeout to 2 seconds
      })
    );

    const results = await Promise.all(promises);
    // console.log('[windowManager] All results:', results);
    return results.includes(true);
  });

  ipcMain.on('mainapp:close-result', (event: any, data: { confirm: boolean, save: boolean }) => {
    // console.log('[windowManager] mainapp:close-result', data);
    if (!mainAppWindow) return;
    if (!data.confirm) return;
    try {
      if (data.save) {
        childWindows.forEach((win) => {
          if (win && !win.isDestroyed()) { 
            // console.log('[windowManager] Sending force-save-and-close to child window');
            win.webContents.send('window:force-save-and-close'); 
          }
        });
      } else {
        // When not saving, need to remove close handler before destroying
        childWindows.forEach((win) => {
          if (win && !win.isDestroyed()) {
            // console.log('[windowManager] Destroying child window directly');
            // Remove close handler to prevent default
            win.removeAllListeners('close');
            win.destroy();
          }
        });
      }
    } catch (error) {
      // console.error('[windowManager] mainapp:close-result error', error);
    } finally {
      childWindows.length = 0;
      const win = mainAppWindow;
      setTimeout(() => { 
        win?.removeAllListeners('close');
        win?.destroy(); 
      }, 300);
      mainAppWindow = null;
    }
  });

  return mainAppWindow;
}

export function createRecorderWindow(testcaseId?: string, projectId?: string, testcaseName?: string, browserType?: string, testSuiteId?: string, evidenceId?: string) {
  const recorderWindow = createWindow({ width: 500, height: 800 }, "recorder");
  childWindows.push(recorderWindow);
  if (testcaseId) {
    const displayName = testcaseName || "";
    recorderWindow.webContents.on('did-finish-load', () => {
      recorderWindow.setTitle(`Recorder - ${displayName}`);
    });
  } else {
    recorderWindow.setTitle('Record actions on a website');
  }

  recorderWindow.on('close', (event) => {
    event.preventDefault();
    recorderWindow.webContents.send('recorder:close-requested');

    const index = childWindows.indexOf(recorderWindow);
    if (index !== -1) {
      childWindows.splice(index, 1);
    }
  });

  // console.log('[WindowManager] TestSuite ID', testSuiteId);

  if (testcaseId) {
    setTimeout(() => {
      const currentUrl = recorderWindow.webContents.getURL();
      const separator = currentUrl.includes('?') ? '&' : '?';
      const browserTypeParam = browserType ? `&browserType=${encodeURIComponent(browserType)}` : '';
      const testSuiteIdParam = testSuiteId ? `&testSuiteId=${encodeURIComponent(testSuiteId)}` : '';
      const evidenceIdParam = evidenceId ? `&evidenceId=${encodeURIComponent(evidenceId)}` : '';
      const newUrl = `${currentUrl}${separator}testcaseId=${encodeURIComponent(testcaseId)}&projectId=${encodeURIComponent(projectId || '')}${browserTypeParam}${testSuiteIdParam}${evidenceIdParam}`;
      recorderWindow.loadURL(newUrl);
    }, 1000);
  } else { }

  return recorderWindow;
}

