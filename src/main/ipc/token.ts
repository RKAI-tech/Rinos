import { ipcMain } from "electron";
import Store from "electron-store";
import { MainEnv } from "../env.js";

export function registerTokenIpc() {
  const store = new Store<Record<string, unknown>>();

  ipcMain.handle("token:get", () => {
    return (store.get(MainEnv.ACCESS_TOKEN_KEY) as string | undefined) || null;
  });

  ipcMain.handle("token:set", (_evt, token: string | null) => {
    if (token) store.set(MainEnv.ACCESS_TOKEN_KEY, token);
    else store.delete(MainEnv.ACCESS_TOKEN_KEY);
    return true;
  });

  ipcMain.handle("token:remove", () => {
    store.delete(MainEnv.ACCESS_TOKEN_KEY);
    return true;
  });

  // Email storage handlers
  ipcMain.handle("email:get", () => {
    return (store.get(MainEnv.USER_EMAIL_KEY) as string | undefined) || null;
  });

  ipcMain.handle("email:set", (_evt, email: string | null) => {
    if (email) store.set(MainEnv.USER_EMAIL_KEY, email);
    else store.delete(MainEnv.USER_EMAIL_KEY);
    return true;
  });

  ipcMain.handle("email:remove", () => {
    store.delete(MainEnv.USER_EMAIL_KEY);
    return true;
  });

  // Username storage handlers
  ipcMain.handle("username:get", () => {
    return (store.get(MainEnv.USER_USERNAME_KEY) as string | undefined) || null;
  });

  ipcMain.handle("username:set", (_evt, username: string | null) => {
    if (username) store.set(MainEnv.USER_USERNAME_KEY, username);
    else store.delete(MainEnv.USER_USERNAME_KEY);
    return true;
  });

  ipcMain.handle("username:remove", () => {
    store.delete(MainEnv.USER_USERNAME_KEY);
    return true;
  });
}


