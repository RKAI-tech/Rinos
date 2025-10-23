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
  }>;
}

interface SystemAPI {
  platform: string;
  versions: NodeJS.ProcessVersions;
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

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    appInfo?: AppInfo; // Legacy support
  }
}

export {};

declare module 'xlsx';