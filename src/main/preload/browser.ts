import { contextBridge, ipcRenderer } from "electron";
import { Action, AssertType } from "../../browser/types";
import { BrowserStorageType } from "../../browser/controller";

const browserMethods = {
    start: async (basicAuthentication: { username: string, password: string }) => ipcRenderer.invoke("browser:start", basicAuthentication),
    stop: async () => ipcRenderer.invoke("browser:stop"),
    executeActions: async (actions: Action[]) => ipcRenderer.invoke("browser:executeActions", actions),
    navigate: async (url: string) => ipcRenderer.invoke("browser:navigate", url),
    onAction: (handler: (action: Action) => void) => {
        const listener = (_: unknown, action: Action) => handler(action);
        ipcRenderer.on("browser:action", listener);
        return () => {
            ipcRenderer.removeListener("browser:action", listener);
        };
    },
    onBrowserClose: (handler: () => void) => {
        const listener = () => handler();
        ipcRenderer.on("browser:stopped", listener);
        return () => {
            ipcRenderer.removeListener("browser:stopped", listener);
        };
    },
    onActionExecuting: (handler: (data: { index: number }) => void) => {
        const listener = (_: unknown, data: { index: number }) => handler(data);
        ipcRenderer.on("browser:action-executing", listener);
        return () => {
            ipcRenderer.removeListener("browser:action-executing", listener);
        };
    },
    onActionFailed: (handler: (data: { index: number }) => void) => {
        const listener = (_: unknown, data: { index: number }) => handler(data);
        ipcRenderer.on("browser:action-failed", listener);
        return () => {
            ipcRenderer.removeListener("browser:action-failed", listener);
        };
    },
    setAssertMode: async (enabled: boolean, assertType: AssertType) => ipcRenderer.invoke("browser:setAssertMode", enabled, assertType),
    setProjectId: async (projectId: string) => ipcRenderer.invoke("browser:setProjectId", projectId),
    getProjectId: async () => ipcRenderer.invoke("browser:getProjectId"),
    setAuthToken: async (token: string | null) => ipcRenderer.invoke("browser:setAuthToken", token),

    addBrowserStorage: async (storageType: BrowserStorageType, value: any) => ipcRenderer.invoke("browser:addBrowserStorage", storageType, value),
    reload: async () => ipcRenderer.invoke("browser:reload"),
    goBack: async () => ipcRenderer.invoke("browser:goBack"),
    goForward: async () => ipcRenderer.invoke("browser:goForward"),
}

export function exposeBrowserAPI() {
    contextBridge.exposeInMainWorld("browserAPI", 
        {
            browser: browserMethods,
        }
    );
}