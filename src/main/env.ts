import { config } from "dotenv";
import { app } from "electron";
import path from "path";

// Load environment variables from the correct location
// Ưu tiên nhận diện dev qua Electron (không đóng gói) và fallback bằng NODE_ENV
const isDev =  !app.isPackaged;
const envPath = isDev 
  ? path.join(process.cwd(), ".env")
  : path.join(process.resourcesPath, ".env");

config({ path: envPath });

export const MainEnv = {
  // Dev server URL for renderer (Vite)
  API_URL: process.env.VITE_DEV_SERVER_URL || "http://localhost:5173",

  // Microsoft Authentication (MSAL) configs
  MSAL_CLIENT_ID: process.env.VITE_MSAL_CLIENT_ID || process.env.MSAL_CLIENT_ID || "",
  MSAL_TENANT_ID: process.env.VITE_MSAL_TENANT_ID || process.env.MSAL_TENANT_ID || "common",
  MSAL_REDIRECT_URI:
    process.env.VITE_MSAL_REDIRECT_URI ||
    process.env.MSAL_REDIRECT_URI ||
    "https://login.microsoftonline.com/common/oauth2/nativeclient",
  MSAL_SCOPES: process.env.VITE_MSAL_SCOPES || process.env.MSAL_SCOPES || "openid profile email",

  // Debug flags
  DEBUG_MSAL: (process.env.VITE_DEBUG_MSAL === "true") || (process.env.DEBUG_MSAL === "true") || false,
  NODE_ENV: process.env.NODE_ENV || "development",
  OPEN_DEVTOOLS: process.env.OPEN_DEVTOOLS === "1",

  // Token store config
  ACCESS_TOKEN_KEY: process.env.ACCESS_TOKEN_KEY || 'access_token',
};

export const MainEnvArrays = {
  MSAL_SCOPES: MainEnv.MSAL_SCOPES.split(/\s+/).filter(Boolean),
};
