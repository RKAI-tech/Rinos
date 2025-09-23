/// <reference types="vite/client" />

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
