import { ipcMain, BrowserWindow } from "electron";
import { PublicClientApplication, Configuration, LogLevel, CryptoProvider, AuthorizationUrlRequest, AuthorizationCodeRequest } from "@azure/msal-node";
import { URL } from "url";
import { MainEnv, MainEnvArrays } from "../env.js";


export function registerMicrosoftLoginIpc() {
  ipcMain.handle("auth:microsoft-login", async () => {
    const clientId = MainEnv.MSAL_CLIENT_ID;
    const tenantId = MainEnv.MSAL_TENANT_ID;
    const redirectUri = MainEnv.MSAL_REDIRECT_URI;
    const scopes = MainEnvArrays.MSAL_SCOPES;

    if (!clientId) {
      throw new Error("MSAL clientId is missing. Set VITE_MSAL_CLIENT_ID or MSAL_CLIENT_ID in environment.");
    }

    const config: Configuration = {
      auth: {
        clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
      system: {
        loggerOptions: {
          loggerCallback: (_level, message) => {
            if (MainEnv.DEBUG_MSAL) {
              // console.log("[MSAL]", message);
            }
          },
          logLevel: LogLevel.Info,
          piiLoggingEnabled: false,
        },
      },
    };

    const pca = new PublicClientApplication(config);
    const cryptoProvider = new CryptoProvider();
    const { verifier, challenge } = await cryptoProvider.generatePkceCodes();

    const authUrlRequest: AuthorizationUrlRequest = {
      scopes,
      redirectUri,
      codeChallenge: challenge,
      codeChallengeMethod: "S256",
      prompt: "select_account",
    };

    const authUrl = await pca.getAuthCodeUrl(authUrlRequest);

    const authCode: string = await new Promise<string>((resolve, reject) => {
      const win = new BrowserWindow({
        width: 500,
        height: 700,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
        show: true,
        autoHideMenuBar: true,
        title: "Sign in to Microsoft",
      });

      const cleanup = () => { try { win.close(); } catch {} };

      const handleRedirectLike = (_event: any, urlStr: string) => {
        try {
          const url = new URL(urlStr);
          if (url.origin + url.pathname === redirectUri) {
            const code = url.searchParams.get("code");
            const error = url.searchParams.get("error");
            const errorDesc = url.searchParams.get("error_description");
            if (code) { cleanup(); resolve(code); }
            else { cleanup(); reject(new Error(errorDesc || error || "Authorization failed")); }
          }
        } catch (e) {
          // ignore
        }
      };

      win.webContents.on("will-redirect", handleRedirectLike);
      win.webContents.on("did-navigate", handleRedirectLike);
      win.on("closed", () => reject(new Error("Authentication window closed")));
      win.loadURL(authUrl).catch(reject);
    });

    const tokenRequest: AuthorizationCodeRequest = {
      code: authCode,
      scopes,
      redirectUri,
      codeVerifier: verifier,
    };

    const result = await pca.acquireTokenByCode(tokenRequest);
    if (!result || !result.accessToken) {
      throw new Error("Failed to acquire token from authorization code.");
    }

    return {
      accessToken: result.accessToken,
      idToken: result.idToken || undefined,
      expiresOn: result.expiresOn ? result.expiresOn.toISOString() : null,
    };
  });
}


