import { ipcMain, BrowserWindow } from "electron";
import { BrowserManager } from "../../browser/BrowserManager";
import { Action, AssertType } from "../../browser/types";
import { BrowserContext, Page } from "playwright";
import { setBrowserManager } from "./screen_handle";
import { BrowserStorageType } from "../../browser/controller";

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
            if (manager.pages && manager.pages_index) {
                // Find page with index 0
                let pageWithIndex0: Page | null = null;
                for (const [pageId, index] of manager.pages_index.entries()) {
                    if (index === 0) {
                        pageWithIndex0 = manager.pages.get(pageId) || null;
                        break;
                    }
                }
                if (pageWithIndex0 && !pageWithIndex0.isClosed()) {
                    await pageWithIndex0.evaluate(() => {
                        const global: any = globalThis as any;
                        if (global.setExecutingActionsState) {
                            global.setExecutingActionsState(true);
                        }
                    });
                }
            }
        } catch (e) {
            // Ignore if function doesn't exist
        }
        
        try {
            await manager.controller?.executeMultipleActions(manager.context as BrowserContext, actions);
        } finally {
            (manager as any).isExecuting = false;
            
                // Reset executing state in tracking script
            try {
                if (manager.pages && manager.pages_index) {
                    // Find page with index 0
                    let pageWithIndex0: Page | null = null;
                    for (const [pageId, index] of manager.pages_index.entries()) {
                        if (index === 0) {
                            pageWithIndex0 = manager.pages.get(pageId) || null;
                            break;
                        }
                    }
                    if (pageWithIndex0 && !pageWithIndex0.isClosed()) {
                        await pageWithIndex0.evaluate(() => {
                        const global: any = globalThis as any;
                        if (global.setExecutingActionsState) {
                            global.setExecutingActionsState(false);
                        }
                    });
                    
                    // Add a small delay to ensure resize events can be recorded again
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }} catch (e) {
                // Ignore if function doesn't exist
            }
        }
    });

    ipcMain.handle("browser:addBrowserStorage", async (event, storageType: BrowserStorageType, value: any) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        //check current page
        if (!manager.activePageId) {
            console.error('[Browser] Cannot add browser storage: active page is null');
            return;
        }
        const currentPage = manager.pages.get(manager.activePageId);
        if (!currentPage) {
            console.error('[Browser] Cannot add browser storage: current page is null');
            return;
        }
        
        if (storageType === BrowserStorageType.COOKIE) {
            await manager.controller?.addCookies(manager.context as BrowserContext, currentPage, value);
        } else if (storageType === BrowserStorageType.LOCAL_STORAGE) {
            await manager.controller?.addLocalStorage(currentPage, value);
        } else if (storageType === BrowserStorageType.SESSION_STORAGE) {
            await manager.controller?.addSessionStorage(currentPage, value);
        }
    });

    ipcMain.handle("browser:navigate", async (event, url: string,page_index?: number) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        if (!manager.activePageId) {
            console.error('[Browser] Cannot navigate: active page is null');
            return;
        }
        let pageId = null;
        for (const [idd, index] of manager.pages_index.entries()) {
            if (index === page_index) {
                pageId = idd;
                break;
            }
        }
        if (!pageId) {
            pageId = manager.activePageId;
        }
        if (!pageId) {
            console.error('[Browser] Cannot navigate: page is null');
            return;
        }
        const currentPage = manager.pages.get(pageId);
        if (!currentPage) {
            console.error('[Browser] Cannot navigate: current page is null');
            return;
        }
        await manager.controller?.navigate(currentPage, url);
    });

    ipcMain.handle("browser:reload", async (event,page_index?: number) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        if (!manager.activePageId) {
            console.error('[Browser] Cannot reload: active page is null');
            return;
        }
        let pageId = null;
        for (const [idd, index] of manager.pages_index.entries()) {
            if (index === page_index) {
                pageId = idd;
                break;
            }
        }
        if (!pageId) {
            pageId = manager.activePageId;
        }
        if (!pageId) {
            console.error('[Browser] Cannot reload: page is null');
            return;
        }
        const currentPage = manager.pages.get(pageId);
        if (!currentPage) {
            console.error('[Browser] Cannot reload: page is null');
            return;
        }

        await manager.controller?.reload(currentPage);
    });

    ipcMain.handle("browser:goBack", async (event,page_index?: number) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        if (!manager.activePageId) {
            console.error('[Browser] Cannot go back: active page is null');
            return;
        }
        let pageId = null;
        for (const [idd, index] of manager.pages_index.entries()) {
            if (index === page_index) {
                pageId = idd;
                break;
            }
        }
        if (!pageId) {
            pageId = manager.activePageId;
        }
        if (!pageId) {
            console.error('[Browser] Cannot go back: page is null');
            return;
        }
        const currentPage = manager.pages.get(pageId);
        if (!currentPage) {
            console.error('[Browser] Cannot go back: page is null');
            return;
        }
        await manager.controller?.goBack(currentPage);
    });

    ipcMain.handle("browser:goForward", async (event,page_index?: number) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        if (!manager.activePageId) {
            console.error('[Browser] Cannot go forward: active page is null');
            return;
        }
        let pageId = null;
        for (const [idd, index] of manager.pages_index.entries()) {
            if (index === page_index) {
                pageId = idd;
                break;
            }
        }
        if (!pageId) {
            pageId = manager.activePageId;
        }
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
        console.log('[Browser] Setting auth token:', win);
        if (!win) return;
        console.log('[Browser] Setting auth token:', token);
        const manager = getOrCreateManagerForWindow(win);
        manager.setAuthToken(token);
    });

    // Get a single value by source and key: 'local' | 'session' | 'cookie'
    ipcMain.handle("browser:getAuthValue", async (event, source: 'local' | 'session' | 'cookie', key: string, page_index: number, options?: { cookieDomainMatch?: string, cookieDomainRegex?: string }) => {
        const win = getWindowFromEvent(event);
        if (!win) return null;
        const manager = getOrCreateManagerForWindow(win);
        const domainOpt = options?.cookieDomainMatch || undefined;
        const regexOpt = options?.cookieDomainRegex ? new RegExp(options.cookieDomainRegex) : undefined;
        const value = await manager.getAuthValue(source, key, page_index, { cookieDomainMatch: regexOpt || domainOpt });
        return value;
    });

    ipcMain.handle("browser:getBasicAuthFromStorage", async (event, payload: {
        type: 'localStorage' | 'sessionStorage' | 'cookie',
        usernameKey?: string,
        passwordKey?: string,
        cookieDomainMatch?: string,
        cookieDomainRegex?: string,
        page_index?: number,
    }) => {
        const win = getWindowFromEvent(event);
        if (!win) return { username: null, password: null };
        const manager = getOrCreateManagerForWindow(win);
        const cookieDomainMatch = payload.cookieDomainRegex
            ? new RegExp(payload.cookieDomainRegex)
            : (payload.cookieDomainMatch || undefined);
        const result = await manager.getBasicAuthFromStorage({
            type: payload.type,
            usernameKey: payload.usernameKey,
            passwordKey: payload.passwordKey,
            page_index: payload.page_index,
            cookieDomainMatch,
            
        });
        return result;
    });
}