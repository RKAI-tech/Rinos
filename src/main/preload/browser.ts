import { contextBridge, ipcRenderer } from "electron";
import { Action } from "../../browser/types";

const browserMethods = {
    start: async () => ipcRenderer.invoke("browser:start"),
    stop: async () => ipcRenderer.invoke("browser:stop"),
    executeActions: async (actions: Action[]) => ipcRenderer.invoke("browser:executeActions", actions),
    navigate: async (url: string) => ipcRenderer.invoke("browser:navigate", url),
}

export function exposeBrowserAPI() {
    contextBridge.exposeInMainWorld("browserAPI", 
        {
            browser: browserMethods,
        }
    );
}