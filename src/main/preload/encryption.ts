import { contextBridge, ipcRenderer } from "electron";

export function exposeEncryptionAPI() {
  contextBridge.exposeInMainWorld("encryptionStore", {
    getKey: async (projectId: string): Promise<string | null> => {
      return ipcRenderer.invoke("encryption:getKey", projectId);
    },
    setKey: async (projectId: string, key: string): Promise<boolean> => {
      return ipcRenderer.invoke("encryption:setKey", projectId, key);
    },
    hasKey: async (projectId: string): Promise<boolean> => {
      return ipcRenderer.invoke("encryption:hasKey", projectId);
    },
    removeKey: async (projectId: string): Promise<boolean> => {
      return ipcRenderer.invoke("encryption:removeKey", projectId);
    },
    getAllKeys: async (): Promise<Record<string, string>> => {
      return ipcRenderer.invoke("encryption:getAllKeys");
    },
  });
}

