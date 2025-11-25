import { ipcMain } from "electron";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { app } from "electron";

const execAsync = promisify(exec);

// Get playwright browsers path (same logic as BrowserManager)
function getBrowsersPath(): string {
  if (!app.isPackaged) {
    return path.resolve(process.cwd(), "playwright-browsers");
  } else {
    return path.join(process.resourcesPath, "playwright-browsers");
  }
}

// Map browser type to playwright browser name
function mapBrowserTypeToPlaywright(browserType: string): string {
  const normalized = browserType.toLowerCase();
  switch (normalized) {
    case 'chrome':
    case 'edge':
      return 'chromium';
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

// Check if required browsers are installed
export async function checkBrowsersInstalled(browserTypes: string[]): Promise<{ [key: string]: boolean }> {
  const result: { [key: string]: boolean } = {};
  
  for (const browserType of browserTypes) {
    const playwrightBrowser = mapBrowserTypeToPlaywright(browserType);
    result[browserType] = await isBrowserInstalled(playwrightBrowser);
  }
  
  return result;
}

// Install playwright browsers
export async function installPlaywrightBrowsers(
  browsers: string[],
  onProgress?: (browser: string, progress: number, status: string) => void
): Promise<void> {
  const browsersPath = getBrowsersPath();
  
  // Ensure directory exists
  if (!fs.existsSync(browsersPath)) {
    fs.mkdirSync(browsersPath, { recursive: true });
  }
  
  // Set environment variable
  process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
  process.env.PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS = '1';
  
  for (const browser of browsers) {
    try {
      onProgress?.(browser, 0, `Starting installation of ${browser}...`);
      
      // Use npx playwright install without --with-deps to avoid sudo requirement
      // Browsers will be installed to PLAYWRIGHT_BROWSERS_PATH (user directory, no sudo needed)
      const command = `npx playwright install ${browser}`;
      
      onProgress?.(browser, 25, `Downloading ${browser}...`);
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PLAYWRIGHT_BROWSERS_PATH: browsersPath,
          PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS: '1',
          PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '0',
        },
        maxBuffer: 1024 * 1024 * 100, // 100MB buffer
      });
      
      onProgress?.(browser, 75, `Extracting ${browser}...`);
      
      // Wait a bit to ensure installation completes
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onProgress?.(browser, 100, `${browser} installed successfully`);
      
      // Note: System dependencies (--with-deps) are not installed to avoid requiring sudo
      // Browsers should work if system dependencies are already installed
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onProgress?.(browser, 0, `Error installing ${browser}: ${errorMessage}`);
      throw new Error(`Failed to install ${browser}: ${errorMessage}`);
    }
  }
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
}

