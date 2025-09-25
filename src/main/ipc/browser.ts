import { ipcMain } from "electron";
import { BrowserManager } from "../../browser/BrowserManager";
import { Action } from "../../browser/types";
import { Page } from "playwright";

const browserManager = new BrowserManager();

browserManager.on('action', (action: Action) => {
    console.log('[BROWSER] Action received:', action);
});

export function registerBrowserIpc() {
    ipcMain.handle("browser:start", async () => {
        await browserManager.start();
    });
    ipcMain.handle("browser:stop", async () => {
        await browserManager.stop();
    });
    ipcMain.handle("browser:executeActions", async (_, actions: Action[]) => {
        await browserManager.controller?.executeMultipleActions(browserManager.page as Page, actions);
    });
    ipcMain.handle("browser:navigate", async (_, url: string) => {
        await browserManager.controller?.navigate(browserManager.page as Page, url);
    });
}