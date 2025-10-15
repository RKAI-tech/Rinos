import { BrowserWindow, app, screen } from "electron";
import { MainEnv } from "./env.js";
import path from "path";

const isDev = true; //app.isPackaged;
// Build target is CJS, so __dirname is available; avoid import.meta to silence warnings
const __dirnameResolved = __dirname;
// console.log(__dirnameResolved)
async function tryLoadDevPaths(win: BrowserWindow, page: string) {
  // console.log('tryLoadDevPaths', MainEnv.API_URL, page);
  const candidates = [
    `${MainEnv.API_URL}/${page}/index.html`,
    `${MainEnv.API_URL}/${page}.html`,
    `${MainEnv.API_URL}/index.html`,
    `${MainEnv.API_URL}/`,
  ];
  for (const url of candidates) {
    try {
      await win.loadURL(url);
      // console.log("Loaded URL:", url);
      return;
    } catch (err) {
      // console.warn("Failed to load URL:", url, err);
    }
  }
  throw new Error("Không thể load trang renderer từ Vite. Kiểm tra vite.config và đường dẫn.");
}

function createWindow(options: Electron.BrowserWindowConstructorOptions, page: string) {
  // console.log('createWindow', options, page);
  // console.log('__dirname', __dirnameResolved);
  const win = new BrowserWindow({
    ...options,
    webPreferences: {
      preload: path.join(__dirnameResolved, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    win.webContents.openDevTools();
    tryLoadDevPaths(win, page).catch((err) => {
      // console.error("Load dev URL failed:", err);
    });
  } else {
    // console.log('__dirnameResolved', __dirnameResolved);
    win.loadFile(path.join(__dirnameResolved, `renderer/${page}/index.html`));
  }
  win.webContents.openDevTools();
  return win;
}

export function createMainAppWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const win = createWindow({ width, height }, "main_app");
  return win;
}

export function createRecorderWindow(testcaseId?: string, projectId?: string) {
  const win = createWindow({ width: 500, height: 800 }, "recorder");
  
  // Thêm event listener cho window close event
  win.on('close', (event) => {
    // Ngăn chặn việc đóng cửa sổ ngay lập tức
    event.preventDefault();
    
    // Gửi sự kiện đến renderer để hiển thị modal xác nhận
    win.webContents.send('window:close-requested');
  });
  
  // Nếu có testcaseId, thêm vào URL sau khi window được tạo
  if (testcaseId) {
    // Đợi một chút để đảm bảo window đã load xong
    setTimeout(() => {
      const currentUrl = win.webContents.getURL();
      const separator = currentUrl.includes('?') ? '&' : '?';
      const newUrl = `${currentUrl}${separator}testcaseId=${encodeURIComponent(testcaseId)}&projectId=${encodeURIComponent(projectId || '')}`;
      // console.log('[WindowManager] Setting project ID:', projectId);
      // console.log('[WindowManager] Loading recorder with testcaseId:', testcaseId);
      // console.log('[WindowManager] Current URL:', currentUrl);
      // console.log('[WindowManager] New URL:', newUrl);
      win.loadURL(newUrl);
    }, 1000); // Đợi 1 giây để đảm bảo window đã load xong
  } else {
    // console.log('[WindowManager] Creating recorder window without testcaseId and projectId');
  }
  
  return win;
}

