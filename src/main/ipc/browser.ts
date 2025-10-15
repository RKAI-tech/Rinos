import { ipcMain, BrowserWindow } from "electron";
import { BrowserManager } from "../../browser/BrowserManager";
import { Action, AssertType } from "../../browser/types";
import { Page } from "playwright";
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
    console.log('[Browser] Getting manager for window 1:', id, manager);
    if (manager) return manager;

    manager = new BrowserManager();
    windowIdToManager.set(id, manager);
    console.log('[Browser] Getting manager for window 2:', id, manager);
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
    ipcMain.handle("browser:start", async (event) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        await manager.start();
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
        try {
            await manager.controller?.executeMultipleActions(manager.page as Page, actions);
        } finally {
            (manager as any).isExecuting = false;
        }
    });

    ipcMain.handle("browser:navigate", async (event, url: string) => {
        const win = getWindowFromEvent(event);
        if (!win) return;
        const manager = getOrCreateManagerForWindow(win);
        await manager.controller?.navigate(manager.page as Page, url);
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