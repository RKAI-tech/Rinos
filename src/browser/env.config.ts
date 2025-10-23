// Cấu hình môi trường cho Microsoft Login và API
const env = process.env;

export const config = {
  // Microsoft Authentication Configuration (use Vite env with VITE_ prefix)
  MSAL_CLIENT_ID: env.VITE_MSAL_CLIENT_ID || '6c05e266-c15b-4a52-9965-f5e4c326f69a',
  MSAL_TENANT_ID: env.VITE_MSAL_TENANT_ID || 'd43d7b87-367a-4e2c-9e40-9ded6a42bf83',
  MSAL_REDIRECT_URI: env.VITE_MSAL_REDIRECT_URI || 'https://login.microsoftonline.com/common/oauth2/nativeclient',
  MSAL_SCOPES: env.VITE_MSAL_SCOPES || 'openid profile email',
  DEBUG_MSAL: String(env.VITE_DEBUG_MSAL).toLowerCase() === 'true' || !!env.DEV,

  // API Configuration
  API_BASE_URL: env.VITE_API_BASE_URL || 'https://testscripts.rikkei.org',
  API_TIMEOUT: Number(env.VITE_API_TIMEOUT || 30000),
  API_RETRY_ATTEMPTS: Number(env.VITE_API_RETRY_ATTEMPTS || 3),

  // Token Storage Keys
  ACCESS_TOKEN_KEY: env.VITE_ACCESS_TOKEN_KEY || 'access_token',
  USER_DATA_KEY: env.VITE_USER_DATA_KEY || 'user_data',
  REFRESH_TOKEN_KEY: env.VITE_REFRESH_TOKEN_KEY || 'refresh_token',
};