import { ipcMain } from "electron";
import { exec, spawn, ChildProcess } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { app } from "electron";

const execAsync = promisify(exec);

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

// Get Edge executable path for custom installation
function getEdgeExecutablePath(): string | null {
  const customBrowsersPath = getCustomBrowsersPath();
  const platform = process.platform;
  
  let edgePath: string;
  
  if (platform === 'win32') {
    edgePath = path.join(customBrowsersPath, "edge-win", "Microsoft", "Edge", "Application", "msedge.exe");
  } else if (platform === 'darwin') {
    edgePath = path.join(customBrowsersPath, "edge-mac", "Microsoft Edge.app", "Contents", "MacOS", "Microsoft Edge");
  } else {
    // Linux
    edgePath = path.join(customBrowsersPath, "edge-linux", "final", "microsoft-edge");
  }
  
  // Check if executable exists and is accessible
  if (fs.existsSync(edgePath)) {
    // On Linux/Mac, check if file is executable
    if (platform !== 'win32') {
      try {
        fs.accessSync(edgePath, fs.constants.X_OK);
      } catch {
        // Make executable if not
        fs.chmodSync(edgePath, 0o755);
      }
    }
    return edgePath;
  }
  
  return null;
}

// System Edge paths helper
function getSystemEdgePaths(): string[] {
  const platform = process.platform;
  if (platform === 'win32') {
    return [
      path.join(process.env.LOCALAPPDATA || '', "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(process.env.PROGRAMFILES || '', "Microsoft", "Edge", "Application", "msedge.exe"),
      path.join(process.env["PROGRAMFILES(X86)"] || '', "Microsoft", "Edge", "Application", "msedge.exe"),
    ].filter(Boolean);
  }
  if (platform === 'darwin') {
    return [
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      path.join(process.env.HOME || '', "Applications", "Microsoft Edge.app", "Contents", "MacOS", "Microsoft Edge"),
    ];
  }
  
  return [
    "/usr/bin/microsoft-edge",
    "/usr/bin/microsoft-edge-stable",
    "/opt/microsoft/msedge/msedge",
    "/snap/bin/microsoft-edge",
  ];
}

// System Chrome paths helper
function getSystemChromePaths(): string[] {
  const platform = process.platform;
  if (platform === 'win32') {
    return [
      path.join(process.env.LOCALAPPDATA || '', "Google", "Chrome", "Application", "chrome.exe"),
      path.join(process.env.PROGRAMFILES || '', "Google", "Chrome", "Application", "chrome.exe"),
      path.join(process.env["PROGRAMFILES(X86)"] || '', "Google", "Chrome", "Application", "chrome.exe"),
    ].filter(Boolean);
  }
  if (platform === 'darwin') {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      path.join(process.env.HOME || '', "Applications", "Google Chrome.app", "Contents", "MacOS", "Google Chrome"),
    ];
  }
  
  return [
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
  ];
}

// System Firefox paths helper
function getSystemFirefoxPaths(): string[] {
  const platform = process.platform;
  if (platform === 'win32') {
    return [
      path.join(process.env.LOCALAPPDATA || '', "Mozilla Firefox", "firefox.exe"),
      path.join(process.env.PROGRAMFILES || '', "Mozilla Firefox", "firefox.exe"),
      path.join(process.env["PROGRAMFILES(X86)"] || '', "Mozilla Firefox", "firefox.exe"),
    ].filter(Boolean);
  }
  if (platform === 'darwin') {
    return [
      "/Applications/Firefox.app/Contents/MacOS/firefox",
      path.join(process.env.HOME || '', "Applications", "Firefox.app", "Contents", "MacOS", "firefox"),
    ];
  }
  
  return [
    "/usr/bin/firefox",
    "/usr/bin/firefox-esr",
    "/snap/bin/firefox",
  ];
}

// System Safari paths helper (macOS only)
function getSystemSafariPaths(): string[] {
  if (process.platform !== 'darwin') {
    return [];
  }
  return [
    "/Applications/Safari.app/Contents/MacOS/Safari",
  ];
}

function getFirstExistingPath(paths: string[]): string | null {
  for (const target of paths) {
    if (target && fs.existsSync(target)) {
      return target;
    }
  }
  return null;
}

// Check if Chrome is installed (system or playwright)
async function isChromeInstalled(): Promise<boolean> {
  const systemPath = getFirstExistingPath(getSystemChromePaths());
  if (systemPath) return true;
  
  // Check playwright chromium installation
  return await isBrowserInstalled('chromium');
}

// Check if Firefox is installed (system or playwright)
async function isFirefoxInstalled(): Promise<boolean> {
  const systemPath = getFirstExistingPath(getSystemFirefoxPaths());
  if (systemPath) return true;
  
  // Check playwright firefox installation
  return await isBrowserInstalled('firefox');
}

// Check if Safari is installed (chỉ Playwright WebKit, không dùng Safari hệ thống)
async function isSafariInstalled(): Promise<boolean> {
  // Safari: Chỉ check Playwright WebKit, không dùng Safari hệ thống
  // vì Safari hệ thống không cho phép inject script và có hạn chế
  return await isBrowserInstalled('webkit');
}

// Check if Edge is installed (system or custom)
async function isEdgeInstalled(): Promise<boolean> {
  const systemPath = getFirstExistingPath(getSystemEdgePaths());
  if (systemPath) return true;
  
  const customEdgePath = getEdgeExecutablePath();
  if (customEdgePath) {
    return true;
  }
  
  return false;
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
    // Special handling for Edge
    if (browser.id === 'edge') {
      const systemPath = getFirstExistingPath(getSystemEdgePaths());
      const customPath = getEdgeExecutablePath();
      if (systemPath) {
        return {
          id: browser.id,
          label: browser.label,
          status: 'system',
          installSource: 'system',
          paths: [systemPath],
          updatedAt: getLatestUpdatedAt([systemPath]),
          note: 'Using system Edge installation',
        };
      }
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
    
    // Check for system Chrome
    if (browser.id === 'chrome') {
      const systemPath = getFirstExistingPath(getSystemChromePaths());
      if (systemPath) {
        return {
          id: browser.id,
          label: browser.label,
          status: 'system',
          installSource: 'system',
          paths: [systemPath],
          updatedAt: getLatestUpdatedAt([systemPath]),
          note: 'Using system Chrome installation',
        };
      }
    }
    
    // Check for system Firefox
    if (browser.id === 'firefox') {
      const systemPath = getFirstExistingPath(getSystemFirefoxPaths());
      if (systemPath) {
        return {
          id: browser.id,
          label: browser.label,
          status: 'system',
          installSource: 'system',
          paths: [systemPath],
          updatedAt: getLatestUpdatedAt([systemPath]),
          note: 'Using system Firefox installation',
        };
      }
    }
    
    // Safari: Chỉ check Playwright WebKit, không dùng Safari hệ thống
    // vì Safari hệ thống không cho phép inject script và có hạn chế
    
    // Check Playwright installations
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
    const customBase =
      platform === 'win32'
        ? path.join(getCustomBrowsersPath(), 'edge-win')
        : platform === 'darwin'
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
      // Special handling for Edge: check both custom and system installation
      result[browserType] = await isEdgeInstalled();
    } else if (normalized === 'chrome') {
      // Check system Chrome or Playwright Chromium
      result[browserType] = await isChromeInstalled();
    } else if (normalized === 'firefox') {
      // Check system Firefox or Playwright Firefox
      result[browserType] = await isFirefoxInstalled();
    } else if (normalized === 'safari') {
      // Check system Safari or Playwright WebKit
      result[browserType] = await isSafariInstalled();
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
  const INSTALL_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const PROGRESS_UPDATE_INTERVAL = 5000; // 5 seconds
  const PROGRESS_INCREMENT = 2; // 2% per interval
  const platform = process.platform;
  
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
    
    if (platform === 'win32') {
      scriptPath = path.join(scriptDir, "win.ps1");
      if (!fs.existsSync(scriptPath)) {
        reject(new Error(`Edge installation script not found: ${scriptPath}`));
        return;
      }
      command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}"`;
    } else if (platform === 'darwin') {
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
          // Kill the process and all its children
          if (platform === 'win32') {
            exec(`taskkill /F /T /PID ${child.pid}`, () => {});
          } else {
            process.kill(-child.pid, 'SIGKILL');
          }
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

// Install playwright browsers with timeout and progress simulation
export async function installPlaywrightBrowsers(
  browsers: string[],
  onProgress?: (browser: string, progress: number, status: string) => void
): Promise<void> {
  const browsersPath = getBrowsersPath();
  const INSTALL_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const PROGRESS_UPDATE_INTERVAL = 5000; // 5 seconds
  const PROGRESS_INCREMENT = 2; // 2% per interval
  
  // Ensure directory exists
  if (!fs.existsSync(browsersPath)) {
    fs.mkdirSync(browsersPath, { recursive: true });
  }
  
  // Set environment variable
  process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
  process.env.PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = '1';
  
  const totalBrowsers = browsers.length;
  let completedBrowsers = 0;
  let browserProgresses: number[] = new Array(totalBrowsers).fill(0); // Track progress of each browser (0-100)
  
  // Helper function to calculate overall progress
  const calculateOverallProgress = (browserIndex: number, browserProgress: number): number => {
    // Update the progress for this browser
    browserProgresses[browserIndex] = browserProgress;
    
    // Each browser gets an equal share of the total progress
    const progressPerBrowser = 100 / totalBrowsers;
    let totalProgress = 0;
    
    // Sum up progress from all browsers
    for (let i = 0; i < totalBrowsers; i++) {
      totalProgress += (browserProgresses[i] / 100) * progressPerBrowser;
    }
    
    return Math.min(Math.round(totalProgress), 100);
  };
  
  // Helper function to update progress
  const updateProgress = (browser: string, browserIndex: number, browserProgress: number, status: string) => {
    const overallProgress = calculateOverallProgress(browserIndex, browserProgress);
    onProgress?.(browser, overallProgress, status);
  };
  
  for (let i = 0; i < browsers.length; i++) {
    const browser = browsers[i];
    
    try {
      // Special handling for Edge: use custom installation script
      if (browser.toLowerCase() === 'edge' || browser.toLowerCase() === 'msedge') {
        // Create a wrapper progress callback for Edge
        const edgeProgressWrapper = (browserName: string, browserProgress: number, status: string) => {
          updateProgress(browserName, i, browserProgress, status);
        };
        await installEdgeCustom(edgeProgressWrapper);
        browserProgresses[i] = 100; // Mark as complete
        completedBrowsers++;
        continue;
      }
      
      updateProgress(browser, i, 0, `Starting installation of ${browser}...`);
      
      // Use npx playwright install without --with-deps to avoid sudo requirement
      // Browsers will be installed to PLAYWRIGHT_BROWSERS_PATH (user directory, no sudo needed)
      const command = `npx playwright install ${browser}`;
      
      let browserProgress = 25; // Progress for this browser only (0-100)
      browserProgresses[i] = 25;
      updateProgress(browser, i, 25, `Downloading ${browser}...`);
      
      let lastProgressUpdate = Date.now();
      let progressInterval: NodeJS.Timeout | null = null;
      let execProcess: ChildProcess | null = null;
      let timeoutId: NodeJS.Timeout | null = null;
      
      // Progress simulation
      const startProgressSimulation = () => {
        if (progressInterval) clearInterval(progressInterval);
        progressInterval = setInterval(() => {
          const timeSinceLastUpdate = Date.now() - lastProgressUpdate;
          if (timeSinceLastUpdate > PROGRESS_UPDATE_INTERVAL && browserProgress < 95) {
            browserProgress = Math.min(browserProgress + PROGRESS_INCREMENT, 95);
            browserProgresses[i] = browserProgress;
            updateProgress(browser, i, browserProgress, `Installing ${browser}...`);
          }
        }, PROGRESS_UPDATE_INTERVAL);
      };
      
      // Create a promise with timeout
      const installPromise = new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        execProcess = exec(command, {
          cwd: process.cwd(),
          env: {
            ...process.env,
            PLAYWRIGHT_BROWSERS_PATH: browsersPath,
            PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS: '1',
            PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '0',
          },
          maxBuffer: 1024 * 1024 * 100, // 100MB buffer
        }, (error, stdout, stderr) => {
          // Clean up on completion
          if (timeoutId) clearTimeout(timeoutId);
          if (progressInterval) clearInterval(progressInterval);
          
          if (error) {
            reject(error);
          } else {
            resolve({ stdout, stderr });
          }
        });
        
        // Monitor stdout/stderr for progress updates
        if (execProcess.stdout) {
          execProcess.stdout.on('data', () => {
            lastProgressUpdate = Date.now();
            if (browserProgress < 75) {
              browserProgress = Math.min(browserProgress + 5, 75);
              browserProgresses[i] = browserProgress;
              updateProgress(browser, i, browserProgress, `Downloading ${browser}...`);
            }
          });
        }
        
        if (execProcess.stderr) {
          execProcess.stderr.on('data', () => {
            lastProgressUpdate = Date.now();
          });
        }
      });
      
      // Timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          if (execProcess && !execProcess.killed && execProcess.pid) {
            console.error(`[Playwright IPC] ${browser} installation timeout, killing process...`);
            try {
              if (process.platform === 'win32') {
                exec(`taskkill /F /T /PID ${execProcess.pid}`, () => {});
              } else {
                process.kill(-execProcess.pid, 'SIGKILL');
              }
            } catch (err) {
              console.error(`[Playwright IPC] Error killing process:`, err);
            }
            if (progressInterval) clearInterval(progressInterval);
            reject(new Error(`${browser} installation timeout after 30 minutes`));
          }
        }, INSTALL_TIMEOUT);
      });
      
      // Start progress simulation
      startProgressSimulation();
      
      // Race between install and timeout
      const { stdout, stderr } = await Promise.race([installPromise, timeoutPromise]);
      
      // Clean up (should already be cleaned in promise, but just in case)
      if (timeoutId) clearTimeout(timeoutId);
      if (progressInterval) clearInterval(progressInterval);
      
      // Only set 75% if current progress is less than 75%, otherwise keep current progress
      if (browserProgress < 75) {
        browserProgress = 75;
        browserProgresses[i] = 75;
        updateProgress(browser, i, 75, `Extracting ${browser}...`);
      } else {
        // If already past 75%, just update status without changing progress
        updateProgress(browser, i, browserProgress, `Extracting ${browser}...`);
      }
      
      // Wait a bit to ensure installation completes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      browserProgress = 100;
      browserProgresses[i] = 100;
      completedBrowsers++;
      updateProgress(browser, i, 100, `${browser} installed successfully`);
      
      // Note: System dependencies (--with-deps) are not installed to avoid requiring sudo
      // Browsers should work if system dependencies are already installed
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const overallProgressError = calculateOverallProgress(i, 0);
      onProgress?.(browser, overallProgressError, `Error installing ${browser}: ${errorMessage}`);
      throw new Error(`Failed to install ${browser}: ${errorMessage}`);
    }
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

