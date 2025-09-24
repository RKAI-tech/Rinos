import { BrowserWindow, app, screen } from "electron";
import { MainEnv } from "./env.js";
import path from "path";
import { fileURLToPath } from "url";

const isDev = !app.isPackaged;
const __dirnameResolved = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));
console.log(__dirnameResolved)
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
      console.log("Loaded URL:", url);
      return;
    } catch (err) {
      console.warn("Failed to load URL:", url, err);
    }
  }
  throw new Error("Không thể load trang renderer từ Vite. Kiểm tra vite.config và đường dẫn.");
}

function createWindow(options: Electron.BrowserWindowConstructorOptions, page: string) {
  console.log('createWindow', options, page);
  console.log('__dirname', __dirnameResolved);
  const win = new BrowserWindow({
    ...options,
    webPreferences: {
      preload: path.join(__dirnameResolved, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    tryLoadDevPaths(win, page).catch((err) => {
      console.error("Load dev URL failed:", err);
    });
    if (process.env.OPEN_DEVTOOLS === "1") {
      try {
        win.webContents.openDevTools({ mode: "detach" });
      } catch {}
    }
  } else {
    win.loadFile(path.join(__dirnameResolved, `../renderer/${page}/index.html`));
  }

  return win;
}

export function createMainAppWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const win = createWindow({ width, height }, "main_app");
  try {
    win.webContents.openDevTools({ mode: "detach" });
  } catch {}
  return win;
}

export function createRecorderWindow() {
  return createWindow({ width: 500, height: 800 }, "recoder");
}

