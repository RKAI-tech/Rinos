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
    // childWindows.forEach((win) => {
    //   if (win && !win.isDestroyed()) {
    //     win.destroy();
    //   }
    // });
    // childWindows.length = 0;
    // setTimeout(() => { mainAppWindow?.destroy(); }, 300);
    // mainAppWindow = null;
  });

  ipcMain.on('mainapp:close-result', (event: any, data: { confirm: boolean, save: boolean }) => {
    // console.log('mainapp:close-result', data);
    if (!mainAppWindow) return;
    if (!data.confirm) return;
    try {
      if (data.save) {
        childWindows.forEach((win) => {
          if (win && !win.isDestroyed()) { win.webContents.send('window:force-save-and-close'); }
        });
      } else {
        childWindows.forEach((win) => {
          if (win && !win.isDestroyed()) { win.destroy(); }
        });
      }
    } catch (error) {
      console.error('mainapp:close-result error', error);
    } finally {
      childWindows.length = 0;
      const win = mainAppWindow;
      setTimeout(() => { win?.destroy(); }, 300);
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

