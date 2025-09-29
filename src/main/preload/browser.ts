import { contextBridge, ipcRenderer } from "electron";
import { Action, AssertType } from "../../browser/types";

const browserMethods = {
    start: async () => ipcRenderer.invoke("browser:start"),
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
    setAssertMode: async (enabled: boolean, assertType: AssertType) => ipcRenderer.invoke("browser:setAssertMode", enabled, assertType),
    setProjectId: async (projectId: string) => ipcRenderer.invoke("browser:setProjectId", projectId),
    getProjectId: async () => ipcRenderer.invoke("browser:getProjectId"),
    setAuthToken: async (token: string | null) => ipcRenderer.invoke("browser:setAuthToken", token),
}

export function exposeBrowserAPI() {
    contextBridge.exposeInMainWorld("browserAPI", 
        {
            browser: browserMethods,
        }
    );
}