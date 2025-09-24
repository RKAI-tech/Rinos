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
}


