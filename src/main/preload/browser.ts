import { contextBridge, ipcRenderer } from "electron";
import { Action, AssertType } from "../../browser/types";
import { BrowserStorageType } from "../../browser/controller";

const browserMethods = {
    start: async (basicAuthentication: { username: string, password: string }, browserType?: string) => ipcRenderer.invoke("browser:start", basicAuthentication, browserType),
    stop: async () => ipcRenderer.invoke("browser:stop"),
    executeActions: async (actions: Action[]) => ipcRenderer.invoke("browser:executeActions", actions),
    navigate: async (url: string, page_index?: number) => ipcRenderer.invoke("browser:navigate", url, page_index),
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
    onActionFailed: (handler: (data: { index: number; message?: string }) => void) => {
        const listener = (_: unknown, data: { index: number; message?: string }) => handler(data);
        ipcRenderer.on("browser:action-failed", listener);
        return () => {
            ipcRenderer.removeListener("browser:action-failed", listener);
        };
    },
    setAssertMode: async (enabled: boolean, assertType: AssertType) => ipcRenderer.invoke("browser:setAssertMode", enabled, assertType),
    setProjectId: async (projectId: string) => ipcRenderer.invoke("browser:setProjectId", projectId),
    getProjectId: async () => ipcRenderer.invoke("browser:getProjectId"),
    setAuthToken: async (token: string | null) => ipcRenderer.invoke("browser:setAuthToken", token),

  // Lấy 1 giá trị theo nguồn và key
  getAuthValue: async (
    source: 'local' | 'session' | 'cookie',
    key: string,
    page_index: number,
    options?: { cookieDomainMatch?: string; cookieDomainRegex?: string }
  ) => ipcRenderer.invoke("browser:getAuthValue", source, key, page_index, options),

  // Lấy Basic Auth từ storage/cookie/custom
  getBasicAuthFromStorage: async (payload: {
    type: 'localStorage' | 'sessionStorage' | 'cookie',
    usernameKey?: string,
    passwordKey?: string,
    page_index?: number,
    cookieDomainMatch?: string,
    cookieDomainRegex?: string,
    
  }) => ipcRenderer.invoke("browser:getBasicAuthFromStorage", payload),
    addBrowserStorage: async (storageType: BrowserStorageType, value: any, page_index?: number) => ipcRenderer.invoke("browser:addBrowserStorage", storageType, value, page_index),
    reload: async (page_index?: number) => ipcRenderer.invoke("browser:reload", page_index),
    goBack: async (page_index?: number) => ipcRenderer.invoke("browser:goBack", page_index),
    goForward: async (page_index?: number) => ipcRenderer.invoke("browser:goForward", page_index),
}

export function exposeBrowserAPI() {
    contextBridge.exposeInMainWorld("browserAPI", 
        {
            browser: browserMethods,
        }
    );
}