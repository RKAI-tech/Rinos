import { ipcMain, shell } from "electron";
import { exec, spawn, fork, ChildProcess } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { app } from "electron";

const execAsync = promisify(exec);
async function fixPermissions(browserPath: string) {
  if (process.platform !== 'darwin' && process.platform !== 'linux') return;
  console.log(`[Permission] Fixing permissions for: ${browserPath}`);
  
  // Lệnh: chmod +x và xóa xattr com.apple.quarantine
  const command = `chmod -R 755 "${browserPath}" && xattr -r -d com.apple.quarantine "${browserPath}" || true`;
  
  return new Promise<void>((resolve) => {
    exec(command, (err) => {
      // Lỗi xattr là bình thường nếu file không bị gắn nhãn, chỉ cần log warning
      if (err) console.log("[Permission] Note:", err.message); 
      resolve();
    });
  });
}
// Get playwright browsers path (dev: project folder, packaged: userData, writable on all OS)
function getBrowsersPath(): string {
  if (!app.isPackaged) {
    // Dev mode: dùng thư mục trong project để dễ debug/clean
    return path.resolve(process.cwd(), "playwright-browsers");
  } else {
    // Packaged (Linux AppImage, macOS, Windows): resources thường read-only,
    // nên dùng userData (vd: ~/.config/<App>/playwright-browsers trên Linux)
    return path.join(app.getPath("userData"), "playwright-browsers");
  }
}

// Get custom browsers path (my-browsers directory)
function getCustomBrowsersPath(): string {
  if (!app.isPackaged) {
    return path.resolve(process.cwd(), "my-browsers");
  } else {
    // Packaged: đặt trong userData giống playwright-browsers
    return path.join(app.getPath("userData"), "my-browsers");
  }
}

// Get system Edge executable path on Windows
function getSystemEdgePath(): string | null {
  if (process.platform !== 'win32') {
    return null;
  }
  
  // Các đường dẫn phổ biến của Edge trên Windows
  const possiblePaths = [
    path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.ProgramFiles || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ];
  
  for (const edgePath of possiblePaths) {
    if (fs.existsSync(edgePath)) {
      return edgePath;
    }
  }
  
  return null;
}

// Get Edge executable path for custom installation
function getEdgeExecutablePath(): string | null {
  const platform = process.platform;
  
  // Trên Windows: ưu tiên tìm Edge hệ thống
  if (platform === 'win32') {
    const systemEdgePath = getSystemEdgePath();
    if (systemEdgePath) {
      return systemEdgePath;
    }
    // Nếu không có Edge hệ thống, không tìm custom (vì không tải về nữa)
    return null;
  }
  
  // Mac và Linux: vẫn dùng custom installation
  const customBrowsersPath = getCustomBrowsersPath();
  let edgePath: string;
  
  if (platform === 'darwin') {
    edgePath = path.join(customBrowsersPath, "edge-mac", "Microsoft Edge.app", "Contents", "MacOS", "Microsoft Edge");
  } else {
    // Linux
    edgePath = path.join(customBrowsersPath, "edge-linux", "final", "microsoft-edge");
  }
  
  // Check if executable exists and is accessible
  if (fs.existsSync(edgePath)) {
    // On Linux/Mac, check if file is executable
    try {
      fs.accessSync(edgePath, fs.constants.X_OK);
    } catch {
      // Make executable if not
      fs.chmodSync(edgePath, 0o755);
    }
    return edgePath;
  }
  
  return null;
}

// Check if Chrome is installed (Playwright-managed only)
async function isChromeInstalled(): Promise<boolean> {
  return await isBrowserInstalled('chromium');
}

// Check if Firefox is installed (Playwright-managed only)
async function isFirefoxInstalled(): Promise<boolean> {
  return await isBrowserInstalled('firefox');
}

// Check if Safari is installed (chỉ Playwright WebKit, không dùng Safari hệ thống)
async function isSafariInstalled(): Promise<boolean> {
  // Safari: Chỉ check Playwright WebKit, không dùng Safari hệ thống
  // vì Safari hệ thống không cho phép inject script và có hạn chế
  return await isBrowserInstalled('webkit');
}

// Check if Edge is installed
async function isEdgeInstalled(): Promise<boolean> {
  const platform = process.platform;
  
  // Trên Windows: kiểm tra Edge hệ thống
  if (platform === 'win32') {
    return !!getSystemEdgePath();
  }
  
  // Mac và Linux: kiểm tra custom installation
  const customEdgePath = getEdgeExecutablePath();
  return !!customEdgePath;
}

// Map browser type to playwright browser name
function mapBrowserTypeToPlaywright(browserType: string): string {
  const normalized = browserType.toLowerCase();
  switch (normalized) {
    case 'chrome':
      return 'chromium';
    case 'edge':
      // Edge is handled separately, return 'msedge' for installation purposes
      return 'msedge';
    case 'firefox':
      return 'firefox';
    case 'safari':
      return 'webkit';
    default:
      return 'chromium';
  }
}

// Check if a browser is installed
async function isBrowserInstalled(browserName: string): Promise<boolean> {
  try {
    const browsersPath = getBrowsersPath();
    
    // Check if browsers directory exists
    if (!fs.existsSync(browsersPath)) {
      return false;
    }
    
    // Playwright installs browsers with version suffix (e.g., chromium-1234, firefox-5678, webkit-2215)
    // Check for directories that start with the browser name followed by a dash
    const entries = fs.readdirSync(browsersPath, { withFileTypes: true });
    
    for (const entry of entries) {
      // Check if it's a directory and starts with the browser name followed by '-'
      if (entry.isDirectory() && entry.name.startsWith(browserName + '-')) {
        const browserDir = path.join(browsersPath, entry.name);
        
        // Check if directory has content (not empty)
        try {
          const files = fs.readdirSync(browserDir);
          if (files.length > 0) {
            // Found browser directory with content - browser is installed
            return true;
          }
        } catch (err) {
          // Continue checking other directories if this one fails
          continue;
        }
      }
    }
    
    // Also check for exact match (for backward compatibility or manual installations)
    const exactBrowserDir = path.join(browsersPath, browserName);
    if (fs.existsSync(exactBrowserDir)) {
      try {
        const files = fs.readdirSync(exactBrowserDir);
        if (files.length > 0) {
          return true;
        }
      } catch (err) {
        // Ignore errors
      }
    }
    
    return false;
  } catch (error) {
    console.error(`[Playwright IPC] Error checking browser ${browserName}:`, error);
    return false;
  }
}

type BrowserInstallSource = 'playwright' | 'custom' | 'system' | null;

type BrowserInfoResponse = {
  id: string;
  label: string;
  status: 'not-installed' | 'installed' | 'system';
  installSource: BrowserInstallSource;
  paths: string[];
  updatedAt?: string;
  note?: string;
};

const MANAGED_BROWSERS: Array<{ id: string; label: string; playwrightName: string }> = [
  { id: 'chrome', label: 'Google Chrome', playwrightName: 'chromium' },
  { id: 'edge', label: 'Microsoft Edge', playwrightName: 'msedge' },
  { id: 'firefox', label: 'Mozilla Firefox', playwrightName: 'firefox' },
  { id: 'safari', label: 'Apple Safari', playwrightName: 'webkit' },
];

function getPlaywrightInstallPaths(browserName: string): string[] {
  const browsersPath = getBrowsersPath();
  if (!fs.existsSync(browsersPath)) {
    return [];
  }
  const entries = fs.readdirSync(browsersPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(browserName + '-'))
    .map((entry) => path.join(browsersPath, entry.name));
}

function removeDirectory(targetPath: string) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true });
  }
}

function getLatestUpdatedAt(paths: string[]): string | undefined {
  try {
    const timestamps = paths
      .map((p) => {
        try {
          const stat = fs.statSync(p);
          return stat.mtime.toISOString();
        } catch {
          return null;
        }
      })
      .filter(Boolean) as string[];
    if (timestamps.length === 0) return undefined;
    return timestamps.sort().reverse()[0];
  } catch {
    return undefined;
  }
}

function getBrowsersInfo(): BrowserInfoResponse[] {
  return MANAGED_BROWSERS.map((browser) => {
    // Special handling cho Edge
    if (browser.id === 'edge') {
      const platform = process.platform;
      
      // Trên Windows: sử dụng Edge hệ thống
      if (platform === 'win32') {
        const systemEdgePath = getSystemEdgePath();
        if (systemEdgePath) {
          return {
            id: browser.id,
            label: browser.label,
            status: 'system',
            installSource: 'system',
            paths: [systemEdgePath],
            updatedAt: getLatestUpdatedAt([systemEdgePath]),
            note: 'System Edge browser (managed by Windows)',
          };
        }
        return {
          id: browser.id,
          label: browser.label,
          status: 'not-installed',
          installSource: null,
          paths: [],
        };
      }
      
      // Mac và Linux: dùng custom installation
      const customPath = getEdgeExecutablePath();
      if (customPath) {
        return {
          id: browser.id,
          label: browser.label,
          status: 'installed',
          installSource: 'custom',
          paths: [customPath],
          updatedAt: getLatestUpdatedAt([customPath]),
          note: 'Custom Edge build managed by application',
        };
      }
      return {
        id: browser.id,
        label: browser.label,
        status: 'not-installed',
        installSource: null,
        paths: [],
      };
    }
    
    // Tất cả browser khác: chỉ kiểm tra bản do Playwright quản lý
    const playwrightName = browser.playwrightName;
    const paths = getPlaywrightInstallPaths(playwrightName);
    
    if (paths.length > 0) {
      return {
        id: browser.id,
        label: browser.label,
        status: 'installed',
        installSource: 'playwright',
        paths,
        updatedAt: getLatestUpdatedAt(paths),
      };
    }
    
    return {
      id: browser.id,
      label: browser.label,
      status: 'not-installed',
      installSource: null,
      paths: [],
    };
  });
}

async function removeBrowserInstallation(browserType: string): Promise<string[]> {
  const normalized = browserType.toLowerCase();
  const removedPaths: string[] = [];
  
  if (normalized === 'edge') {
    const platform = process.platform;
    
    // Trên Windows: không cho phép xóa Edge hệ thống
    if (platform === 'win32') {
      throw new Error('Cannot remove system Edge on Windows. Edge is managed by the operating system.');
    }
    
    // Mac và Linux: cho phép xóa custom installation
    const customBase =
      platform === 'darwin'
        ? path.join(getCustomBrowsersPath(), 'edge-mac')
        : path.join(getCustomBrowsersPath(), 'edge-linux');
    
    if (!fs.existsSync(customBase)) {
      throw new Error('Edge custom installation not found.');
    }
    
    removeDirectory(customBase);
    removedPaths.push(customBase);
    return removedPaths;
  }
  
  const playwrightName = mapBrowserTypeToPlaywright(browserType);
  const paths = getPlaywrightInstallPaths(playwrightName);
  if (!paths.length) {
    throw new Error(`No installation found for ${browserType}.`);
  }
  paths.forEach((dir) => {
    removeDirectory(dir);
    removedPaths.push(dir);
  });
  return removedPaths;
}

// Check if required browsers are installed
export async function checkBrowsersInstalled(browserTypes: string[]): Promise<{ [key: string]: boolean }> {
  const result: { [key: string]: boolean } = {};
  
  for (const browserType of browserTypes) {
    const normalized = browserType.toLowerCase();
    if (normalized === 'edge') {
      // Edge: trên Windows kiểm tra hệ thống, Mac/Linux kiểm tra custom
      result[browserType] = await isEdgeInstalled();
    } else if (normalized === 'chrome') {
      // Chrome: chỉ dùng Chromium do Playwright tải
      result[browserType] = await isBrowserInstalled('chromium');
    } else if (normalized === 'firefox') {
      // Firefox: chỉ dùng Firefox do Playwright tải
      result[browserType] = await isBrowserInstalled('firefox');
    } else if (normalized === 'safari') {
      // Safari/WebKit: chỉ dùng WebKit do Playwright tải
      result[browserType] = await isBrowserInstalled('webkit');
    } else {
      const playwrightBrowser = mapBrowserTypeToPlaywright(browserType);
      result[browserType] = await isBrowserInstalled(playwrightBrowser);
    }
  }
  
  return result;
}

// Install Edge using custom scripts with timeout and progress simulation
async function installEdgeCustom(
  onProgress?: (browser: string, progress: number, status: string) => void
): Promise<void> {
  const platform = process.platform;
  
  // Trên Windows: mở link web để tải Edge
  if (platform === 'win32') {
    onProgress?.('edge', 0, 'Opening Edge download page...');
    const edgeDownloadUrl = 'https://www.microsoft.com/edge';
    try {
      await shell.openExternal(edgeDownloadUrl);
      onProgress?.('edge', 100, 'Edge download page opened in browser');
      // Không reject, chỉ mở link
      return;
    } catch (error) {
      throw new Error(`Failed to open Edge download page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Mac và Linux: tiếp tục dùng script cài đặt
  const INSTALL_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const PROGRESS_UPDATE_INTERVAL = 5000; // 5 seconds
  const PROGRESS_INCREMENT = 2; // 2% per interval
  
  // Get script directory - handle both packaged and dev modes
  let scriptDir: string;
  if (app.isPackaged) {
    // In packaged app, scripts are bundled in resources,
    // nhưng quá trình cài đặt Edge sẽ chạy tại userData (ghi được).
    scriptDir = path.join(process.resourcesPath, "edge_install");
  } else {
    // In dev mode, scripts are in src/main/edge_install
    // Try multiple possible paths
    const possiblePaths = [
      path.join(process.cwd(), "src", "main", "edge_install"), // From project root
      path.resolve(__dirname, "..", "edge_install"), // Relative to compiled location
      path.join(app.getAppPath(), "src", "main", "edge_install"), // From app path
    ];
    
    scriptDir = possiblePaths.find(p => fs.existsSync(p)) || possiblePaths[0];
    
    console.log(`[Playwright IPC] Looking for Edge install scripts in: ${scriptDir}`);
    console.log(`[Playwright IPC] Possible paths tried:`, possiblePaths);
  }
  
  console.log(`[Playwright IPC] Using script directory: ${scriptDir}`);
  
  return new Promise((resolve, reject) => {
    let scriptPath: string;
    let command: string;
    
    // Chỉ xử lý Mac và Linux ở đây (Windows đã được xử lý ở trên)
    if (platform === 'darwin') {
      scriptPath = path.join(scriptDir, "mac.sh");
      if (!fs.existsSync(scriptPath)) {
        reject(new Error(`Edge installation script not found: ${scriptPath}`));
        return;
      }
      // Make script executable
      try {
        fs.chmodSync(scriptPath, 0o755);
      } catch (err) {
        // Ignore chmod errors
      }
      command = `bash "${scriptPath}"`;
    } else {
      // Linux
      scriptPath = path.join(scriptDir, "linux.sh");
      if (!fs.existsSync(scriptPath)) {
        reject(new Error(`Edge installation script not found: ${scriptPath}`));
        return;
      }
      // Make script executable
      try {
        fs.chmodSync(scriptPath, 0o755);
      } catch (err) {
        // Ignore chmod errors
      }
      command = `bash "${scriptPath}"`;
    }
    
    onProgress?.('edge', 0, `Starting Edge installation...`);
    
    // Determine working directory - nơi sẽ tạo my-browsers/edge-*
    const workingDir = app.isPackaged
      ? app.getPath("userData") // packaged: ghi vào userData
      : process.cwd(); // dev mode: project root
    
    const child = spawn(command, [], {
      shell: true,
      cwd: workingDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    
    let output = '';
    let lastProgressUpdate = Date.now();
    let currentProgress = 0;
    let lastReportedProgress = 0;
    let progressInterval: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    let isCompleted = false; // Flag to prevent progress updates after completion
    
    // Progress simulation: increment progress if no update for a while
    const startProgressSimulation = () => {
      if (progressInterval) clearInterval(progressInterval);
      progressInterval = setInterval(() => {
        if (isCompleted) {
          clearInterval(progressInterval!);
          return;
        }
        const timeSinceLastUpdate = Date.now() - lastProgressUpdate;
        if (timeSinceLastUpdate > PROGRESS_UPDATE_INTERVAL && currentProgress < 95) {
          currentProgress = Math.min(currentProgress + PROGRESS_INCREMENT, 95);
          if (currentProgress !== lastReportedProgress && !isCompleted) {
            onProgress?.('edge', currentProgress, `Installing Edge... (${currentProgress}%)`);
            lastReportedProgress = currentProgress;
          }
        }
      }, PROGRESS_UPDATE_INTERVAL);
    };
    
    // Timeout handler
    timeoutId = setTimeout(() => {
      if (child && !child.killed && child.pid) {
        console.error('[Playwright IPC] Edge installation timeout, killing process...');
        try {
          // Kill the process and all its children (Mac/Linux only)
          process.kill(-child.pid, 'SIGKILL');
        } catch (err) {
          console.error('[Playwright IPC] Error killing process:', err);
        }
        reject(new Error('Edge installation timeout after 30 minutes'));
      }
    }, INSTALL_TIMEOUT);
    
    let hasSetDownloading = false;
    let hasSetExtracting = false;
    
    child.stdout?.on('data', (data) => {
      if (isCompleted) return; // Ignore output after completion
      output += data.toString();
      lastProgressUpdate = Date.now();
      // Parse progress from script output - only set once per stage
      if (!hasSetDownloading && (output.includes('Đang tải') || output.includes('Downloading'))) {
        hasSetDownloading = true;
        if (currentProgress < 25) {
          currentProgress = 25;
          lastReportedProgress = 25;
          onProgress?.('edge', 25, `Downloading Edge...`);
        }
      } else if (!hasSetExtracting && (output.includes('Đang giải nén') || output.includes('Extracting'))) {
        hasSetExtracting = true;
        if (currentProgress < 50) {
          currentProgress = 50;
          lastReportedProgress = 50;
          onProgress?.('edge', 50, `Extracting Edge...`);
        }
      }
    });
    
    child.stderr?.on('data', (data) => {
      if (isCompleted) return; // Ignore output after completion
      output += data.toString();
    });
    
    child.on('close', (code) => {
      // Mark as completed first to prevent any further progress updates
      isCompleted = true;
      
      // Clean up
      if (timeoutId) clearTimeout(timeoutId);
      if (progressInterval) clearInterval(progressInterval);
      
      if (code === 0) {
        // Verify installation
        const edgePath = getEdgeExecutablePath();
        if (edgePath && fs.existsSync(edgePath)) {
          // Ensure we send 100% progress before resolving
          onProgress?.('edge', 100, `Edge installed successfully`);
          // Small delay to ensure the progress update is sent
          setTimeout(() => {
            resolve();
          }, 100);
        } else {
          reject(new Error('Edge installation completed but executable not found'));
        }
      } else {
        reject(new Error(`Edge installation failed with code ${code}: ${output}`));
      }
    });
    
    child.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      if (progressInterval) clearInterval(progressInterval);
      reject(new Error(`Failed to start Edge installation: ${error.message}`));
    });
    
    // Start progress simulation
    startProgressSimulation();
  });
}

// Hàm tìm đường dẫn tới CLI của Playwright một cách an toàn
function getPlaywrightCLIPath(): string {
  try {
    // Cách 1: Thử resolve từ require (chính xác nhất nếu module có sẵn)
    // Chúng ta cần file cli.js của package 'playwright-core' (package lõi thực hiện việc tải)
    return require.resolve("playwright-core/cli.js");
  } catch (e) {
    // Cách 2: Fallback thủ công nếu require resolve thất bại trong môi trường production
    const possiblePaths = [
      path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "playwright-core", "cli.js"),
      path.join(process.resourcesPath, "app.asar", "node_modules", "playwright-core", "cli.js"),
      path.join(process.resourcesPath, "node_modules", "playwright-core", "cli.js"),
      path.join(app.getAppPath(), "node_modules", "playwright-core", "cli.js"),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) return p;
    }
    
    // Fallback cuối cùng: dùng playwright wrapper
    try {
        return require.resolve("playwright/cli.js");
    } catch {
        throw new Error("Cannot find Playwright CLI path");
    }
  }
}

// Get playwright install command (dùng Playwright CLI với Electron's node, không cần npx)
function getPlaywrightInstallCommand(browser: string): { command: string; useShell: boolean } {
  try {
    // Luôn dùng getPlaywrightCLIPath() để tìm CLI một cách an toàn
    const cliPath = getPlaywrightCLIPath();
    
    // Dùng process.execPath (Electron's node) để chạy playwright CLI
    // Điều này đảm bảo hoạt động trong packaged app mà không cần node/npx trong PATH
    const command = `"${process.execPath}" "${cliPath}" install ${browser}`;
    console.log(`[Playwright IPC] Using Playwright CLI: ${cliPath}`);
    console.log(`[Playwright IPC] Command: ${command}`);
    
    return { command, useShell: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Playwright IPC] Failed to get Playwright CLI path: ${errorMessage}`);
    throw new Error(`Cannot find Playwright CLI: ${errorMessage}`);
  }
}
export async function installPlaywrightBrowsers(
  browsers: string[],
  onProgress?: (browser: string, progress: number, status: string) => void
): Promise<void> {
  const browsersPath = getBrowsersPath();
  const cliPath = getPlaywrightCLIPath(); // Hàm này của bạn đã viết đúng
  
  // Đảm bảo thư mục tồn tại
  if (!fs.existsSync(browsersPath)) {
    fs.mkdirSync(browsersPath, { recursive: true });
  }

  // Cấu hình môi trường QUAN TRỌNG
  const env = {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: browsersPath,
    PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS: '1',
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '0',
    // Dòng này cực quan trọng: Biến App Electron thành Node.js runtime để chạy script
    ELECTRON_RUN_AS_NODE: '1' 
  };

  const totalBrowsers = browsers.length;
  let browserProgresses: number[] = new Array(totalBrowsers).fill(0);

  // Helper tính tổng tiến độ (giữ nguyên logic của bạn)
  const calculateOverallProgress = (browserIndex: number, browserProgress: number): number => {
    browserProgresses[browserIndex] = browserProgress;
    const progressPerBrowser = 100 / totalBrowsers;
    let totalProgress = 0;
    for (let i = 0; i < totalBrowsers; i++) {
      totalProgress += (browserProgresses[i] / 100) * progressPerBrowser;
    }
    return Math.min(Math.round(totalProgress), 100);
  };

  const updateProgress = (browser: string, browserIndex: number, browserProgress: number, status: string) => {
    const overallProgress = calculateOverallProgress(browserIndex, browserProgress);
    onProgress?.(browser, overallProgress, status);
  };

  for (let i = 0; i < browsers.length; i++) {
    const browser = browsers[i];

    // Xử lý Edge (giữ nguyên logic của bạn)
    if (browser.toLowerCase() === 'edge' || browser.toLowerCase() === 'msedge') {
      const edgeProgressWrapper = (browserName: string, browserProgress: number, status: string) => {
        updateProgress(browserName, i, browserProgress, status);
      };
      await installEdgeCustom(edgeProgressWrapper);
      browserProgresses[i] = 100;
      continue;
    }

    updateProgress(browser, i, 0, `Starting installation of ${browser}...`);
    console.log(`[Playwright IPC] Forking CLI: ${cliPath} to install ${browser}`);

    await new Promise<void>((resolve, reject) => {
      // SỬ DỤNG FORK THAY VÌ EXEC
      // Fork sẽ tự động dùng process.execPath nhưng kèm theo IPC channel
      // và quan trọng là ta truyền env có ELECTRON_RUN_AS_NODE
      const child = fork(cliPath, ["install", browser], {
        env: env,
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'] // Pipe để bắt log
      });

      let currentProgress = 0;

      // Xử lý log từ stdout để giả lập progress
      child.stdout?.on('data', (data) => {
        const output = data.toString();
        
        // Playwright CLI in ra dạng: "Downloading FFMpeg (10%)" hoặc "Downloading Chromium"
        if (output.includes("Downloading")) {
          if (currentProgress < 20) currentProgress = 20;
          updateProgress(browser, i, currentProgress, `Downloading ${browser}...`);
        } else if (output.includes("%")) {
            // Nếu bắt được số % (tùy version CLI), có thể parse ở đây
            // Đơn giản hóa: cứ có data là nhích progress
            if (currentProgress < 80) currentProgress += 5;
            updateProgress(browser, i, currentProgress, `Downloading ${browser}...`);
        } else if (output.includes("Extracting")) {
          currentProgress = 80;
          updateProgress(browser, i, 80, `Extracting ${browser}...`);
        }
      });

      child.stderr?.on('data', (data) => {
        // Playwright thường in progress bar vào stderr
        const output = data.toString();
        // Cập nhật progress dựa trên stderr nếu cần
        if (currentProgress < 80) {
            currentProgress += 2;
            updateProgress(browser, i, currentProgress, `Installing ${browser}...`);
        }
      });

      child.on('close', async (code) => {
        if (code === 0) {
          updateProgress(browser, i, 90, `Verifying ${browser}...`);
          
          // FIX QUYỀN CHO MACOS (Đặc biệt là Webkit/Safari)
          const paths = getPlaywrightInstallPaths(mapBrowserTypeToPlaywright(browser));
          for (const p of paths) {
            await fixPermissions(p);
          }

          updateProgress(browser, i, 100, `Installed ${browser} successfully`);
          resolve();
        } else {
          const err = new Error(`Installation failed with code ${code}`);
          console.error(`[Playwright IPC]`, err);
          reject(err);
        }
      });

      child.on('error', (err) => {
        console.error(`[Playwright IPC] Child process error:`, err);
        reject(err);
      });
    });
  }
}
// Export function to get Edge executable path
export function getEdgeExecutablePathForBrowser(): string | null {
  return getEdgeExecutablePath();
}

// Register IPC handlers
export function registerPlaywrightHandlersIpc() {
  // Check if browsers are installed
  ipcMain.handle("playwright:check-browsers", async (_evt, browserTypes: string[]) => {
    try {
      const result = await checkBrowsersInstalled(browserTypes);
      return { success: true, data: result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  });
  
  // Install browsers with progress updates
  ipcMain.handle("playwright:install-browsers", async (_evt, browsers: string[]) => {
    try {
      // Create a promise that resolves when installation is complete
      // Progress updates will be sent via events
      await installPlaywrightBrowsers(browsers, (browser, progress, status) => {
        // Send progress update to all windows
        const { BrowserWindow } = require("electron");
        BrowserWindow.getAllWindows().forEach((win: any) => {
          if (!win.isDestroyed()) {
            win.webContents.send('playwright:install-progress', {
              browser,
              progress,
              status,
            });
          }
        });
      });
      
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  });
  
  // Get detailed browser info
  ipcMain.handle("playwright:get-browsers-info", async () => {
    try {
      const info = getBrowsersInfo();
      return { success: true, data: info };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  });
  
  // Remove browser installation
  ipcMain.handle("playwright:remove-browser", async (_evt, browserType: string) => {
    try {
      const removed = await removeBrowserInstallation(browserType);
      return { success: true, data: removed };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  });
}

