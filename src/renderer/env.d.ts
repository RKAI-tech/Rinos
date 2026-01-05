/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  // Add other VITE_ prefixed variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface WindowAPI {
  openRecorder: () => Promise<void>;
  closeAllWindows: () => Promise<void>;
  minimizeWindow: () => Promise<void>;
  toggleMaximizeWindow: () => Promise<void>;
}

interface AppAPI {
  getAppInfo: () => Promise<{
    platform: string;
    versions: NodeJS.ProcessVersions;
    isDev: boolean;
    appVersion: string;
  }>;
}

interface SystemAPI {
  platform: string;
  versions: NodeJS.ProcessVersions;
  openExternalUrl: (url: string) => Promise<{ success: boolean; error?: string }>;
}

interface ElectronAPI {
  window: WindowAPI;
  app: AppAPI;
  system: SystemAPI;
}

interface AppInfo {
  platform: string;
  versions: NodeJS.ProcessVersions;
}

interface TokenStore {
  get: () => Promise<string | null>;
  set: (token: string | null) => Promise<boolean>;
  remove: () => Promise<boolean>;
  getEmail: () => Promise<string | null>;
  setEmail: (email: string | null) => Promise<boolean>;
  removeEmail: () => Promise<boolean>;
}

interface EncryptionStore {
  getKey: (projectId: string) => Promise<string | null>;
  setKey: (projectId: string, key: string) => Promise<boolean>;
  hasKey: (projectId: string) => Promise<boolean>;
  removeKey: (projectId: string) => Promise<boolean>;
  getAllKeys: () => Promise<Record<string, string>>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    appInfo?: AppInfo; // Legacy support
    tokenStore?: TokenStore;
    encryptionStore?: EncryptionStore;
  }
}

export {};

declare module 'xlsx';