import { ipcMain, BrowserWindow } from "electron";
import { BrowserManager } from "../../browser/BrowserManager";
import { Action, AssertType } from "../../browser/types";
import { BrowserContext, Page } from "playwright";
import { setBrowserManager } from "./screen_handle";

// Map mỗi cửa sổ recorder -> instance BrowserManager riêng
const windowIdToManager = new Map<number, BrowserManager>();

function getWindowFromEvent(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
    try {
        const win = BrowserWindow.fromWebContents(event.sender);
        return win ?? null;
    } catch {
        return null;
    }
}

function getOrCreateManagerForWindow(win: BrowserWindow): BrowserManager {
    const id = win.id;
    let manager = windowIdToManager.get(id);
    // console.log('[Browser] Getting manager for window 1:', id, manager);
    if (manager) return manager;

    manager = new BrowserManager();
    windowIdToManager.set(id, manager);
    // console.log('[Browser] Getting manager for window 2:', id, manager);
    // Kết nối sự kiện để chỉ gửi về đúng cửa sổ tương ứng
    manager.on('action', (action: Action) => {
        if (!win.isDestroyed()) {
            win.webContents.send('browser:action', action);
        }
    });
    manager.on('browser-stopped', () => {
        if (!win.isDestroyed()) {
            win.webContents.send('browser:stopped');
        }
    });
    manager.on('action-executing', (data: { index: number }) => {
        if (!win.isDestroyed()) {
            win.webContents.send('browser:action-executing', data);
        }
    });
    manager.on('action-failed', (data: { index: number }) => {
        if (!win.isDestroyed()) {
            win.webContents.send('browser:action-failed', data);
        }
    });

    // Khi cửa sổ đóng, đảm bảo tắt browser và dọn dẹp
    const closedHandler = async () => {
        try {
            await manager?.stop();
        } catch {}
        windowIdToManager.delete(id);
    };
    win.once('closed', closedHandler);

    // Cập nhật tham chiếu cho screen_handle (nếu module khác cần)
    // Lưu ý: nhiều recorder -> cập nhật theo cửa sổ vừa tạo gần nhất
    setBrowserManager(manager);

    return manager;
}

export function registerBrowserIpc() {
    ipcMain.handle("browser:start", async (event, basicAuthentication: { username: string, password: string }) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        await manager.start(basicAuthentication);
    });

    ipcMain.handle("browser:stop", async (event) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        (manager as any).isExecuting = false; // Reset execution flag
        await manager.stop();
    });

    ipcMain.handle("browser:executeActions", async (event, actions: Action[]) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        if ((manager as any).isExecuting) {
            return;
        }
        (manager as any).isExecuting = true;
        
        // Set executing state in tracking script to prevent resize event recording
        try {
            if (manager.page) {
                await manager.page.evaluate(() => {
                    const global: any = globalThis as any;
                    if (global.setExecutingActionsState) {
                        global.setExecutingActionsState(true);
                    }
                });
            }
        } catch (e) {
            // Ignore if function doesn't exist
        }
        
        try {
            await manager.controller?.executeMultipleActions(manager.page as Page, manager.context as BrowserContext, actions);
        } finally {
            (manager as any).isExecuting = false;
            
            // Reset executing state in tracking script
            try {
                if (manager.page) {
                    await manager.page.evaluate(() => {
                        const global: any = globalThis as any;
                        if (global.setExecutingActionsState) {
                            global.setExecutingActionsState(false);
                        }
                    });
                    
                    // Add a small delay to ensure resize events can be recorded again
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (e) {
                // Ignore if function doesn't exist
            }
        }
    });

    ipcMain.handle("browser:addCookies", async (event, cookies: any) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        await manager.controller?.addCookies(manager.context as BrowserContext, manager.page as Page, cookies);
    });

    ipcMain.handle("browser:navigate", async (event, url: string) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        // console.log('[Browser] Navigating to:', url);
        await manager.controller?.navigate(manager.page as Page, url);
    });

    ipcMain.handle("browser:reload", async (event) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        await manager.controller?.reload(manager.page as Page);
    });

    ipcMain.handle("browser:goBack", async (event) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        await manager.controller?.goBack(manager.page as Page);
    });

    ipcMain.handle("browser:goForward", async (event) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        await manager.controller?.goForward(manager.page as Page);
    });

    ipcMain.handle("browser:setAssertMode", async (event, enabled: boolean, assertType: AssertType) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        await manager.setAssertMode(enabled, assertType);
    });
    
    // Quản lý Project ID theo cửa sổ
    ipcMain.handle("browser:setProjectId", async (event, projectId: string) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        manager.setProjectId(projectId);
    });
    
    ipcMain.handle("browser:getProjectId", async (event) => {
        const win = getWindowFromEvent(event);
        if (!win) return null;
        const manager = getOrCreateManagerForWindow(win);
        return (manager as any).projectId ?? null;
    });

    ipcMain.handle("browser:setAuthToken", async (event, token: string | null) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        manager.setAuthToken(token);
    });
}