import { ipcMain } from "electron";
import Store from "electron-store";
import * as crypto from "crypto";

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

  /**
   * Generate a random 256-bit encryption key
   * @returns Base64 encoded key string (44 characters)
   */
  ipcMain.handle("crypto:generateKey", async () => {
    try {
      // Generate 32 bytes (256 bits) of random data
      const keyBytes = crypto.randomBytes(32);
      // Convert to Base64 string
      return keyBytes.toString('base64');
    } catch (error) {
      console.error('[Crypto] Failed to generate key:', error);
      throw new Error(`Failed to generate key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Get random values (for compatibility with browser crypto.getRandomValues)
   * @param length - Number of bytes to generate
   * @returns Uint8Array of random bytes
   */
  ipcMain.handle("crypto:getRandomValues", async (_evt, length: number) => {
    try {
      if (!Number.isInteger(length) || length <= 0 || length > 65536) {
        throw new Error('Length must be an integer between 1 and 65536');
      }
      const randomBytes = crypto.randomBytes(length);
      return Array.from(randomBytes); // Convert to array for IPC serialization
    } catch (error) {
      console.error('[Crypto] Failed to get random values:', error);
      throw new Error(`Failed to get random values: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Encrypt plaintext string using AES-256-GCM
   * @param plaintext - The string to encrypt
   * @param keyBase64 - Base64 encoded encryption key
   * @returns Base64 encoded string containing IV + encrypted data + auth tag
   */
  ipcMain.handle("crypto:encrypt", async (_evt, plaintext: string, keyBase64: string) => {
    try {
      // Validate key format
      if (!keyBase64 || typeof keyBase64 !== 'string') {
        throw new Error('Key must be a non-empty string');
      }

      // Decode Base64 key to Buffer
      const keyBuffer = Buffer.from(keyBase64, 'base64');
      if (keyBuffer.length !== 32) {
        throw new Error('Key must be 32 bytes (256 bits) when decoded');
      }

      // Generate random IV (12 bytes for GCM)
      const iv = crypto.randomBytes(12);

      // Create cipher
      const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);

      // Get auth tag (16 bytes)
      const authTag = cipher.getAuthTag();

      // Combine IV + encrypted data + auth tag
      const combined = Buffer.concat([iv, encrypted, authTag]);

      // Convert to Base64
      return combined.toString('base64');
    } catch (error) {
      console.error('[Crypto] Encryption failed:', error);
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  /**
   * Decrypt ciphertext string using AES-256-GCM
   * @param ciphertextBase64 - Base64 encoded string containing IV + encrypted data + auth tag
   * @param keyBase64 - Base64 encoded encryption key
   * @returns Decrypted plaintext string
   */
  ipcMain.handle("crypto:decrypt", async (_evt, ciphertextBase64: string, keyBase64: string) => {
    try {
      // Validate inputs
      if (!ciphertextBase64 || typeof ciphertextBase64 !== 'string') {
        throw new Error('Ciphertext must be a non-empty string');
      }
      if (!keyBase64 || typeof keyBase64 !== 'string') {
        throw new Error('Key must be a non-empty string');
      }

      // Decode Base64 key to Buffer
      const keyBuffer = Buffer.from(keyBase64, 'base64');
      if (keyBuffer.length !== 32) {
        throw new Error('Key must be 32 bytes (256 bits) when decoded');
      }

      // Decode Base64 ciphertext
      const combined = Buffer.from(ciphertextBase64, 'base64');

      // Extract IV (first 12 bytes), encrypted data (middle), and auth tag (last 16 bytes)
      if (combined.length < 28) { // 12 (IV) + 16 (auth tag) minimum
        throw new Error('Ciphertext too short - invalid format');
      }

      const iv = combined.slice(0, 12);
      const authTag = combined.slice(-16);
      const encrypted = combined.slice(12, -16);

      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      // Convert to string
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('[Crypto] Decryption failed:', error);
      // Check if it's an authentication error
      if (error instanceof Error && (error.message.includes('Unsupported state') || error.message.includes('bad decrypt'))) {
        throw new Error('Decryption failed: Invalid key or tampered data');
      }
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });
}

