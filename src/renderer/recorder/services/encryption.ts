/**
 * Encryption service using AES-256-GCM
 * Provides functions for key generation, encryption, and decryption
 * 
 * This is a shared implementation - can be imported from main_app if needed
 */

// Re-export from main_app service to share the same implementation
export {
  generateKey,
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  EncryptionError
} from '../../main_app/services/encryption';

