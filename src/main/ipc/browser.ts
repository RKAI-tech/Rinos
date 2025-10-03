import { ipcMain, BrowserWindow } from "electron";
import { BrowserManager } from "../../browser/BrowserManager";
import { Action, AssertType } from "../../browser/types";
import { Page } from "playwright";
import { setBrowserManager } from "./screen_handle";

const browserManager = new BrowserManager();

// Set browser manager reference for screen_handle
setBrowserManager(browserManager);

browserManager.on('action', (action: Action) => {
    // console.log('[BROWSER] Action received:', action);
    BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
        if (!window.isDestroyed()) {
            window.webContents.send('browser:action', action);
        }
    });
});

browserManager.on('browser-stopped', () => {
    // console.log('[BROWSER] Browser stopped event received');
    BrowserWindow.getAllWindows().forEach((window: BrowserWindow) => {
        if (!window.isDestroyed()) {
            window.webContents.send('browser:stopped');
        }
    });
});

export function registerBrowserIpc() {
    ipcMain.handle("browser:start", async () => {
        await browserManager.start();
    });
    ipcMain.handle("browser:stop", async () => {
        (browserManager as any).isExecuting = false; // Reset execution flag
        await browserManager.stop();
    });
    ipcMain.handle("browser:executeActions", async (_, actions: Action[]) => {
        if ((browserManager as any).isExecuting) {
            // console.log('[BROWSER] Already executing actions, skipping duplicate request');
            return;
        }
        
        // console.log('[BROWSER] Executing actions:', actions);
        (browserManager as any).isExecuting = true;
        
        try {
            await browserManager.controller?.executeMultipleActions(browserManager.page as Page, actions);
        } finally {
            (browserManager as any).isExecuting = false;
        }
    });
    ipcMain.handle("browser:navigate", async (_, url: string) => {
        await browserManager.controller?.navigate(browserManager.page as Page, url);
    });
    ipcMain.handle("browser:setAssertMode", async (_, enabled: boolean, assertType: AssertType) => {
        await browserManager.setAssertMode(enabled, assertType);
    });
    
    // Add project ID management
    ipcMain.handle("browser:setProjectId", async (_, projectId: string) => {
        // console.log('[BROWSER] Setting project ID:', projectId);
        // Use the proper setProjectId method
        browserManager.setProjectId(projectId);
    });
    
    ipcMain.handle("browser:getProjectId", async () => {
        const projectId = (browserManager as any).projectId;
        // console.log('[BROWSER] Getting project ID:', projectId);
        return projectId;
    });
    ipcMain.handle("browser:setAuthToken", async (_, token: string | null) => {
        // console.log('[BROWSER] Setting auth token:', token);
        browserManager.setAuthToken(token);
    });
}