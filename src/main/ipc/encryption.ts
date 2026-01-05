import { ipcMain } from "electron";
import Store from "electron-store";

const ENCRYPTION_KEYS_STORE_KEY = 'encryption_keys';

/**
 * Validate Base64 key format
 */
function validateKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  // Base64 string should be 44 characters (32 bytes * 4/3 rounded up)
  // But we'll be more lenient and just check if it's valid Base64
  try {
    const decoded = Buffer.from(key, 'base64');
    // Key should be 32 bytes (256 bits)
    return decoded.length === 32;
  } catch {
    return false;
  }
}

export function registerEncryptionIpc() {
  const store = new Store<Record<string, unknown>>();

  /**
   * Get encryption key for a project
   */
  ipcMain.handle("encryption:getKey", (_evt, projectId: string) => {
    if (!projectId || typeof projectId !== 'string') {
      return null;
    }
    
    const keys = store.get(ENCRYPTION_KEYS_STORE_KEY) as Record<string, string> | undefined;
    if (!keys) {
      return null;
    }
    
    return keys[projectId] || null;
  });

  /**
   * Set encryption key for a project
   */
  ipcMain.handle("encryption:setKey", (_evt, projectId: string, key: string) => {
    if (!projectId || typeof projectId !== 'string') {
      return false;
    }
    
    if (!validateKeyFormat(key)) {
      console.error('[Encryption] Invalid key format');
      return false;
    }
    
    try {
      const keys = (store.get(ENCRYPTION_KEYS_STORE_KEY) as Record<string, string> | undefined) || {};
      keys[projectId] = key;
      store.set(ENCRYPTION_KEYS_STORE_KEY, keys);
      return true;
    } catch (error) {
      console.error('[Encryption] Failed to set key:', error);
      return false;
    }
  });

  /**
   * Check if project has encryption key
   */
  ipcMain.handle("encryption:hasKey", (_evt, projectId: string) => {
    if (!projectId || typeof projectId !== 'string') {
      return false;
    }
    
    const keys = store.get(ENCRYPTION_KEYS_STORE_KEY) as Record<string, string> | undefined;
    if (!keys) {
      return false;
    }
    
    return !!keys[projectId];
  });

  /**
   * Remove encryption key for a project
   */
  ipcMain.handle("encryption:removeKey", (_evt, projectId: string) => {
    if (!projectId || typeof projectId !== 'string') {
      return false;
    }
    
    try {
      const keys = (store.get(ENCRYPTION_KEYS_STORE_KEY) as Record<string, string> | undefined) || {};
      delete keys[projectId];
      store.set(ENCRYPTION_KEYS_STORE_KEY, keys);
      return true;
    } catch (error) {
      console.error('[Encryption] Failed to remove key:', error);
      return false;
    }
  });

  /**
   * Get all encryption keys (for backup/migration)
   */
  ipcMain.handle("encryption:getAllKeys", () => {
    const keys = store.get(ENCRYPTION_KEYS_STORE_KEY) as Record<string, string> | undefined;
    return keys || {};
  });
}

