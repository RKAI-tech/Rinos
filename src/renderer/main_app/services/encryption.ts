/**
 * Encryption service using AES-256-GCM
 * Provides functions for key generation, encryption, and decryption
 * Uses IPC crypto API (Node.js crypto in main process)
 */

export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}

/**
 * Get crypto API from window
 */
function getCryptoAPI(): {
  generateKey: () => Promise<string>;
  getRandomValues: (length: number) => Promise<Uint8Array>;
  encrypt: (plaintext: string, keyBase64: string) => Promise<string>;
  decrypt: (ciphertextBase64: string, keyBase64: string) => Promise<string>;
} {
  if (typeof window !== 'undefined' && (window as any).cryptoAPI) {
    return (window as any).cryptoAPI;
  }
  throw new EncryptionError('Crypto API not available. Please ensure Electron API is properly initialized.');
}

/**
 * Generate a random 256-bit encryption key
 * @returns Base64 encoded key string (44 characters)
 */
export async function generateKey(): Promise<string> {
  try {
    const cryptoAPI = getCryptoAPI();
    return await cryptoAPI.generateKey();
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError(`Failed to generate key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encrypt plaintext string using AES-256-GCM
 * @param plaintext - The string to encrypt
 * @param keyBase64 - Base64 encoded encryption key
 * @returns Base64 encoded string containing IV + encrypted data + auth tag
 */
export async function encrypt(plaintext: string, keyBase64: string): Promise<string> {
  try {
    // Validate key format
    if (!keyBase64 || typeof keyBase64 !== 'string') {
      throw new EncryptionError('Key must be a non-empty string');
    }
    
    const cryptoAPI = getCryptoAPI();
    return await cryptoAPI.encrypt(plaintext, keyBase64);
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt ciphertext string using AES-256-GCM
 * @param ciphertextBase64 - Base64 encoded string containing IV + encrypted data + auth tag
 * @param keyBase64 - Base64 encoded encryption key
 * @returns Decrypted plaintext string
 */
export async function decrypt(ciphertextBase64: string, keyBase64: string): Promise<string> {
  try {
    // Validate inputs
    if (!ciphertextBase64 || typeof ciphertextBase64 !== 'string') {
      throw new EncryptionError('Ciphertext must be a non-empty string');
    }
    if (!keyBase64 || typeof keyBase64 !== 'string') {
      throw new EncryptionError('Key must be a non-empty string');
    }
    
    const cryptoAPI = getCryptoAPI();
    return await cryptoAPI.decrypt(ciphertextBase64, keyBase64);
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    // Check for decryption failure messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (errorMessage.includes('Invalid key') || errorMessage.includes('tampered data') || errorMessage.includes('bad decrypt')) {
      throw new EncryptionError('Decryption failed: Invalid key or tampered data');
    }
    throw new EncryptionError(`Decryption failed: ${errorMessage}`);
  }
}

/**
 * Set a nested property in an object using dot notation
 */
function setNestedProperty(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

/**
 * Get a nested property from an object using dot notation
 */
function getNestedProperty(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}

/**
 * Encrypt specific fields in an object
 * @param obj - The object to encrypt fields in
 * @param keyBase64 - Base64 encoded encryption key
 * @param fieldsToEncrypt - Array of field paths (supports dot notation, e.g., 'auth.token')
 * @returns New object with specified fields encrypted
 */
export async function encryptObject(
  obj: any,
  keyBase64: string,
  fieldsToEncrypt: string[]
): Promise<any> {
  if (!obj || typeof obj !== 'object') {
    throw new EncryptionError('Object must be a non-null object');
  }
  
  // Create a deep copy to avoid mutating the original
  const result = JSON.parse(JSON.stringify(obj));
  
  for (const fieldPath of fieldsToEncrypt) {
    const value = getNestedProperty(result, fieldPath);
    
    // Only encrypt if the field exists and has a value
    if (value !== undefined && value !== null) {
      // Convert value to string if it's not already
      const valueString = typeof value === 'string' ? value : JSON.stringify(value);
      
      // Encrypt the value
      const encryptedValue = await encrypt(valueString, keyBase64);
      
      // Set the encrypted value back
      setNestedProperty(result, fieldPath, encryptedValue);
    }
  }
  
  return result;
}

/**
 * Decrypt specific fields in an object
 * @param obj - The object to decrypt fields in
 * @param keyBase64 - Base64 encoded encryption key
 * @param fieldsToEncrypt - Array of field paths (supports dot notation, e.g., 'auth.token')
 * @returns New object with specified fields decrypted
 */
export async function decryptObject(
  obj: any,
  keyBase64: string,
  fieldsToDecrypt: string[]
): Promise<any> {
  if (!obj || typeof obj !== 'object') {
    throw new EncryptionError('Object must be a non-null object');
  }
  
  // Create a deep copy to avoid mutating the original
  const result = JSON.parse(JSON.stringify(obj));
  
  for (const fieldPath of fieldsToDecrypt) {
    const value = getNestedProperty(result, fieldPath);
    
    // Only decrypt if the field exists and has a value
    if (value !== undefined && value !== null && typeof value === 'string') {
      try {
        // Decrypt the value
        const decryptedValue = await decrypt(value, keyBase64);
        
        // Try to parse as JSON, if it fails, use as string
        let parsedValue: any;
        try {
          parsedValue = JSON.parse(decryptedValue);
        } catch {
          parsedValue = decryptedValue;
        }
        
        // Set the decrypted value back
        setNestedProperty(result, fieldPath, parsedValue);
      } catch (error) {
        // If decryption fails, keep the original value
        // This allows for backward compatibility with unencrypted data
        console.warn(`Failed to decrypt field ${fieldPath}:`, error);
      }
    }
  }
  return result;
}

/**
 * Export Base64 key to PEM format
 * @param keyBase64 - Base64 encoded encryption key
 * @returns PEM formatted string with headers
 */
export function exportKeyToPEM(keyBase64: string): string {
  if (!keyBase64 || typeof keyBase64 !== 'string') {
    throw new EncryptionError('Key must be a non-empty string');
  }
  
  // Validate Base64 format
  try {
    const decoded = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    if (decoded.length !== 32) {
      throw new EncryptionError('Key must be 32 bytes (256 bits)');
    }
  } catch (error) {
    throw new EncryptionError('Invalid Base64 key format');
  }
  
  // Format as PEM with headers
  const pemContent = `-----BEGIN PRIVATE KEY-----\n${keyBase64}\n-----END PRIVATE KEY-----`;
  return pemContent;
}

/**
 * Import Base64 key from PEM format
 * @param pemContent - PEM formatted string
 * @returns Base64 encoded key string
 */
export function importKeyFromPEM(pemContent: string): string {
  if (!pemContent || typeof pemContent !== 'string') {
    throw new EncryptionError('PEM content must be a non-empty string');
  }
  
  // Remove PEM headers and whitespace
  let keyBase64 = pemContent
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '')
    .trim();
  
  if (!keyBase64) {
    throw new EncryptionError('PEM file does not contain a valid key');
  }
  
  // Validate Base64 format and length
  try {
    const decoded = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    if (decoded.length !== 32) {
      throw new EncryptionError('Key must be 32 bytes (256 bits)');
    }
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError('Invalid Base64 key format in PEM file');
  }
  
  return keyBase64;
}

/**
 * Download key as PEM file
 * @param keyBase64 - Base64 encoded encryption key
 * @param filename - Filename for the downloaded file
 */
export function downloadPEMFile(keyBase64: string, filename: string): void {
  try {
    const pemContent = exportKeyToPEM(keyBase64);
    
    // Create blob with PEM content
    const blob = new Blob([pemContent], { type: 'application/x-pem-file' });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.endsWith('.pem') ? filename : `${filename}.pem`;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    throw new EncryptionError(`Failed to download PEM file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate Base64 key format
 * @param keyBase64 - Base64 encoded key to validate
 * @returns true if valid, throws EncryptionError if invalid
 */
export function validateKeyFormat(keyBase64: string): boolean {
  if (!keyBase64 || typeof keyBase64 !== 'string') {
    throw new EncryptionError('Key must be a non-empty string');
  }
  
  try {
    const decoded = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    if (decoded.length !== 32) {
      throw new EncryptionError('Key must be 32 bytes (256 bits) when decoded');
    }
    return true;
  } catch (error) {
    if (error instanceof EncryptionError) {
      throw error;
    }
    throw new EncryptionError('Invalid Base64 key format');
  }
}

