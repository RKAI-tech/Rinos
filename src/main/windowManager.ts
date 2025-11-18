import { BrowserWindow, app, ipcMain, screen } from "electron";
import { MainEnv } from "./env.js";
import path from "path";

const isDev = false;
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
  throw new Error("Không thể load trang renderer từ Vite. Kiểm tra vite.config và đường dẫn.");
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
    win.webContents.openDevTools();
    tryLoadDevPaths(win, page).catch((err) => {
    });
  } else {
    win.loadFile(path.join(__dirnameResolved, `renderer/${page}/index.html`));
  }
  // win.webContents.openDevTools();
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

  // Handler để lấy unsaved flags từ tất cả child windows
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
        
        // Lắng nghe response với requestId để match
        const responseHandler = (_event: any, data: { requestId: string, hasUnsaved: boolean }) => {
          // console.log('[windowManager] Received response:', data);
          if (data.requestId === requestId) {
            ipcMain.removeListener('window:unsaved-datas-response', responseHandler);
            // console.log('[windowManager] Matched response, hasUnsaved:', data.hasUnsaved);
            resolve(data.hasUnsaved);
          }
        };
        
        ipcMain.on('window:unsaved-datas-response', responseHandler);
        
        // Gửi request với requestId
        win.webContents.send('window:get-unsaved-datas-flag', requestId);
        
        // Timeout để tránh treo nếu child window không phản hồi
        setTimeout(() => {
          ipcMain.removeListener('window:unsaved-datas-response', responseHandler);
          // console.log('[windowManager] Timeout waiting for response from child window:', requestId);
          resolve(false);
        }, 2000); // Tăng timeout lên 2 giây
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
        // Khi không save, cần remove close handler trước khi destroy
        childWindows.forEach((win) => {
          if (win && !win.isDestroyed()) {
            // console.log('[windowManager] Destroying child window directly');
            // Remove close handler để tránh prevent default
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

export function createRecorderWindow(testcaseId?: string, projectId?: string, testcaseName?: string) {
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

  if (testcaseId) {
    setTimeout(() => {
      const currentUrl = recorderWindow.webContents.getURL();
      const separator = currentUrl.includes('?') ? '&' : '?';
      const newUrl = `${currentUrl}${separator}testcaseId=${encodeURIComponent(testcaseId)}&projectId=${encodeURIComponent(projectId || '')}`;
      recorderWindow.loadURL(newUrl);
    }, 1000);
  } else { }

  return recorderWindow;
}

