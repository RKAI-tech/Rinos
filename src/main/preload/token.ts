import { contextBridge, ipcRenderer } from "electron";

export function exposeTokenAPI() {
  contextBridge.exposeInMainWorld("tokenStore", {
    get: async (): Promise<string | null> => ipcRenderer.invoke("token:get"),
    set: async (token: string | null): Promise<boolean> => ipcRenderer.invoke("token:set", token),
    remove: async (): Promise<boolean> => ipcRenderer.invoke("token:remove"),
  });
}


