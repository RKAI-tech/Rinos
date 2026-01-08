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

  // Expose crypto API for encryption operations
  contextBridge.exposeInMainWorld("cryptoAPI", {
    generateKey: async (): Promise<string> => {
      return ipcRenderer.invoke("crypto:generateKey");
    },
    getRandomValues: async (length: number): Promise<Uint8Array> => {
      const array = await ipcRenderer.invoke("crypto:getRandomValues", length);
      return new Uint8Array(array);
    },
    encrypt: async (plaintext: string, keyBase64: string): Promise<string> => {
      return ipcRenderer.invoke("crypto:encrypt", plaintext, keyBase64);
    },
    decrypt: async (ciphertextBase64: string, keyBase64: string): Promise<string> => {
      return ipcRenderer.invoke("crypto:decrypt", ciphertextBase64, keyBase64);
    },
  });
}

